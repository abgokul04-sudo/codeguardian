import os
import json
import time
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
from agents.code_executor import execute_code

# Language display mapping for prompting
SUPPORTED_HUMAN_LANGUAGES = {
    "en": "English",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)",
    "hi": "Hindi (हिन्दी)",
    "ml": "Malayalam (മലയാളം)"
}

# Supported fallback model priority to avoid 429 rate limit errors
FALLBACK_MODELS = [
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.6-flash",
]

def generate_with_fallback(client, prompt: str, schema=None, mime_type: str = None) -> Any:
    """
    Tries models in order and handles 429 quota exhaustion gracefully.
    """
    last_error = None
    for model_name in FALLBACK_MODELS:
        for attempt in range(2):
            try:
                config_args = {}
                if mime_type:
                    config_args["response_mime_type"] = mime_type
                if schema:
                    config_args["response_schema"] = schema
                
                config = types.GenerateContentConfig(**config_args) if config_args else None
                
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                err_str = str(e)
                last_error = e
                print(f"Model {model_name} attempt {attempt + 1} encountered: {err_str[:120]}")
                time.sleep(1.0 * (attempt + 1))
                # If 429 quota exceeded, switch model immediately
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    break
    raise last_error or RuntimeError("All AI models currently busy. Please try again.")

class IssueItem(BaseModel):
    line: int = Field(..., description="Exact line number of the issue")
    problem: str = Field(..., description="Clear problem statement in the requested explanation language")
    why_it_happens: str = Field(..., description="Why the problem occurs, simple explanation in the requested explanation language")
    suggested_fix: str = Field(..., description="Suggested fix explanation in the requested explanation language")
    category: str = Field(default="Error", description="Category: Error, Potential Problem, or Suggestion")

class VariableItem(BaseModel):
    name: str = Field(..., description="Variable or parameter name (e.g., 'numbers', 'myList', 'count')")
    value: str = Field(..., description="Variable value or reference pointer (e.g., '10', '\"Jaya\"', '-> tuple (3 items)')")
    target_object_id: Optional[str] = Field(default="", description="ID of HeapObject if this variable points to an object (e.g. 'obj-1')")

class StackFrame(BaseModel):
    frame_name: str = Field(..., description="Frame name (e.g., 'Global frame', 'listSum', 'calculateTotal')")
    is_active: bool = Field(default=True, description="Whether this frame is the currently executing active call frame")
    variables: List[VariableItem] = Field(default_factory=list, description="Variables and parameters defined inside this frame")

class HeapObject(BaseModel):
    object_id: str = Field(..., description="Unique ID for object (e.g. 'obj-1', 'obj-2')")
    type_name: str = Field(..., description="Object type (e.g., 'function', 'list', 'tuple', 'dict', 'array', 'object')")
    label: str = Field(..., description="Object signature, header or name (e.g., 'listSum(numbers)', 'tuple', 'list')")
    elements: List[str] = Field(default_factory=list, description="Values/elements inside container or linked nodes (e.g., ['0: 1', '1: 2', '2: 3'])")
    points_to: Optional[str] = Field(default="", description="If a linked node or pointer, target object ID")

class WalkthroughStep(BaseModel):
    step_number: int = Field(..., description="Step index starting from 1")
    phase: str = Field(..., description="One of: 'Start', 'Input', 'Variable Creation', 'Processing', 'Condition Check', 'Loop Iteration', 'Function Call', 'Result', 'Output', 'End'")
    step_type: str = Field(default="process", description="Flowchart node shape type: 'start_end', 'input_output', 'condition', 'loop', 'process'")
    code_snippet: str = Field(..., description="Exact code statement being executed in this step")
    condition: Optional[str] = Field(default="", description="If condition or loop check (e.g., 'i < 5' or 'is_valid == True')")
    explanation: str = Field(..., description="Clear step explanation in the user's selected explanation language")
    state_changes: str = Field(..., description="Current state of variables or data at this step (e.g., 'name = \"Jaya\"')")
    next_step: Optional[str] = Field(default="", description="Where flow goes next (e.g., 'Goes to Step 3' or 'Loops back to Step 2')")
    branch_true: Optional[str] = Field(default="", description="If condition is True, where does it go?")
    branch_false: Optional[str] = Field(default="", description="If condition is False, where does it go?")
    frames: List[StackFrame] = Field(default_factory=list, description="Memory stack call frames at this step (Global frame, active function frame, variables)")
    objects: List[HeapObject] = Field(default_factory=list, description="Heap memory objects (functions, lists, tuples, dictionaries, linked nodes) with pointers")

class ImplementedFix(BaseModel):
    line: int = Field(..., description="Line number where fix was applied")
    fix_description: str = Field(..., description="Clear description of the exact minimal change made, in the requested explanation language")

class ReviewResultSchema(BaseModel):
    errors_found: List[IssueItem] = Field(default_factory=list, description="List of errors and bugs found in the code")
    potential_problems: List[IssueItem] = Field(default_factory=list, description="List of warnings or potential edge case issues")
    correct_parts: List[str] = Field(default_factory=list, description="List of parts or logic implemented correctly in the user's code, in explanation language")
    suggestions: List[str] = Field(default_factory=list, description="List of actionable suggestions for improvement, in explanation language")
    implemented_fixes: List[ImplementedFix] = Field(default_factory=list, description="List of specific minimal changes made in the improved code, in explanation language")
    improved_code: str = Field(..., description="The minimally modified code fixing all issues while strictly preserving structure, variable names, and style")
    explanation: str = Field(..., description="Comprehensive summary explanation in the user's selected explanation language")
    walkthrough: List[WalkthroughStep] = Field(default_factory=list, description="Step-by-step visual execution flow trace")
    simulated_output: str = Field(default="", description="Simulated execution output if runtime was unable to run it natively")

def get_review(language: str, code: str, explanation_language: str = "en", standard_input: str = "") -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    client = genai.Client(api_key=api_key)
    target_lang_name = SUPPORTED_HUMAN_LANGUAGES.get(explanation_language, "English")
    
    exec_result = execute_code(language, code, standard_input=standard_input)
    
    prompt = f"""
    You are an expert AI Programming Tutor and Code Review Agent.
    Review the following {language} code.
    
    CRITICAL INSTRUCTIONS:
    1. EXPLANATION LANGUAGE:
       All issues, problem statements, 'why it happens', 'suggested fix', 'implemented fixes', 'correct parts', 'suggestions', 'walkthrough explanations', and overall 'explanation' MUST be written in {target_lang_name}.
       IMPORTANT: The programming code itself MUST remain strictly in its original programming language ({language}).
    
    2. MINIMAL CODE MODIFICATION:
       - Do NOT rewrite the entire program unnecessarily.
       - Make the SMALLEST POSSIBLE changes required to fix identified problems.
       - Preserve the original structure, user variable names, and original programming approach.
    
    3. STEP-BY-STEP VISUAL EXECUTION TRACER & MEMORY VISUALIZER:
       - Provide a step-by-step trace showing both:
         A. Control Flow: Next step, condition evaluation, loops, and logic branches.
         B. Python-Tutor style Execution Memory Visualizer:
            - `frames`: Stack call frames (e.g. "Global frame", function call frames like "listSum") and the variables/arguments inside them.
            - `objects`: Heap memory objects (functions, tuples, lists, objects) and reference pointers (`target_object_id`).
       - Make each step clear with exact code snippets, state changes, and localized explanation in {target_lang_name}.
    
    4. NO SCORES:
       - Focus entirely on actionable feedback: Correct parts, Errors found, Potential problems, Suggestions, and Minimal Improved Code.
    
    Actual Execution Engine Status:
    Executed: {exec_result.get('executed')}
    Status: {exec_result.get('status')}
    Stdout: {exec_result.get('output')}
    Stderr/Error: {exec_result.get('error')}
    
    Code to review:
    ```{language}
    {code}
    ```
    """
    
    try:
        raw_json = generate_with_fallback(
            client=client,
            prompt=prompt,
            schema=ReviewResultSchema,
            mime_type="application/json"
        )
        data = json.loads(raw_json)
        
        improved_code_str = data.get("improved_code", "")
        improved_exec = None
        if improved_code_str and improved_code_str.strip():
            improved_exec = execute_code(language, improved_code_str, standard_input=standard_input)

        data["execution"] = {
            "executed": exec_result.get("executed", False),
            "status": exec_result.get("status", "unknown"),
            "output": exec_result.get("output", ""),
            "error": exec_result.get("error", ""),
            "simulated_output": data.get("simulated_output", ""),
            "improved_execution": improved_exec
        }
        data["language"] = language
        data["explanation_language"] = explanation_language
        return data
    except Exception as e:
        print(f"Error in get_review: {e}")
        return {"error": f"Review failed: {str(e)}"}

def chat_about_code(code: str, language: str, explanation_language: str, review_context: dict, messages: list) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    client = genai.Client(api_key=api_key)
    target_lang_name = SUPPORTED_HUMAN_LANGUAGES.get(explanation_language, "English")
    
    system_instruction = f"""
    You are an intelligent, friendly AI Programming Tutor and Assistant.
    The user is asking questions about a specific piece of code they just had reviewed.
    
    Context:
    - Programming Language: {language}
    - User's preferred explanation language: {target_lang_name}
    
    Code under discussion:
    ```{language}
    {code}
    ```
    
    Review Summary / Errors identified:
    {json.dumps(review_context.get('errors_found', []), ensure_ascii=False)}
    
    Improved Code:
    ```{language}
    {review_context.get('improved_code', '')}
    ```
    
    GUIDELINES:
    1. Respond primarily in {target_lang_name} (Tamil, Telugu, Hindi, Malayalam, or English).
    2. Keep answers clear, educational, and directly relevant to the user's specific code.
    """
    
    formatted_contents = []
    for msg in messages:
        role = "user" if msg.get("role") == "user" else "model"
        formatted_contents.append(f"{role.upper()}: {msg.get('content', '')}")
    
    full_prompt = f"{system_instruction}\n\nConversation History:\n" + "\n".join(formatted_contents) + "\n\nMODEL:"
    
    try:
        reply = generate_with_fallback(client=client, prompt=full_prompt)
        return reply.strip() if reply else "Sorry, I couldn't process your question."
    except Exception as e:
        print(f"Error in chat_about_code: {e}")
        return "Sorry, I encountered a temporary connection issue. Please try asking again."

def get_walkthrough(language: str, code: str, explanation_language: str = "en") -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    client = genai.Client(api_key=api_key)
    target_lang_name = SUPPORTED_HUMAN_LANGUAGES.get(explanation_language, "English")
    
    prompt = f"""
    You are an Execution Tracer and Visual Tutor.
    Provide a conceptual step-by-step walkthrough of how the following {language} code executes in {target_lang_name}.
    Follow the pipeline: Input -> Processing -> Function/Logic -> Result -> Output.
    
    Code:
    ```{language}
    {code}
    ```
    """
    
    class WalkthroughOnlyResponse(BaseModel):
        walkthrough: List[WalkthroughStep]
    
    try:
        raw_json = generate_with_fallback(
            client=client,
            prompt=prompt,
            schema=WalkthroughOnlyResponse,
            mime_type="application/json"
        )
        return json.loads(raw_json)
    except Exception as e:
        return {"error": f"Failed to get walkthrough: {str(e)}"}

class TranslationResult(BaseModel):
    translated_code: str = Field(..., description="The idiomatic, syntactically correct translated code in target language")
    target_language: str = Field(..., description="Target programming language")
    explanation: str = Field(..., description="Clear explanation of the translation, libraries used, and key idiomatic differences in the user's explanation language")
    key_differences: List[str] = Field(default_factory=list, description="Key syntax or paradigm differences between source and target language")

def get_translation(code: str, source_language: str, target_language: str, explanation_language: str = "en") -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    client = genai.Client(api_key=api_key)
    target_lang_name = SUPPORTED_HUMAN_LANGUAGES.get(explanation_language, "English")
    
    prompt = f"""
    You are an expert Multi-Language Code Translator and Programming Tutor.
    
    Task:
    Translate the following {source_language} code into clean, idiomatic {target_language}.
    
    CRITICAL FORMATTING INSTRUCTIONS:
    1. The `translated_code` MUST BE FORMATTED LINE-BY-LINE with proper newline characters (\\n) and indentation.
       - NEVER collapse the program into a single line.
       - Each import, function definition, statement, loop, and block must be on its own separate line.
    2. Write the explanation and key_differences in {target_lang_name}.
    3. Ensure the functionality, logic, and variable intents match the original code precisely.
    4. Provide the result strictly in JSON matching the schema.
    
    Source Code ({source_language}):
    ```{source_language}
    {code}
    ```
    """
    
    try:
        raw_json = generate_with_fallback(
            client=client,
            prompt=prompt,
            schema=TranslationResult,
            mime_type="application/json"
        )
        data = json.loads(raw_json)
        
        # Ensure translated_code has real newlines and isn't squashed
        if "translated_code" in data and isinstance(data["translated_code"], str):
            code_str = data["translated_code"]
            if "\\n" in code_str and "\n" not in code_str:
                code_str = code_str.replace("\\n", "\n")
            data["translated_code"] = code_str
            
        return data
    except Exception as e:
        print(f"Error in get_translation: {e}")
        return {"error": f"Translation error: {str(e)}"}

class LineExplanation(BaseModel):
    line_number: int = Field(..., description="Line number of code")
    code: str = Field(..., description="Exact code on this line")
    simple_explanation: str = Field(..., description="Plain, beginner-friendly explanation of what this line does in simple words")

class BeginnerAnalysisResult(BaseModel):
    language: str = Field(..., description="Programming language")
    lines_of_code: int = Field(..., description="Total lines of code")
    functions_count: int = Field(default=0, description="Number of functions defined")
    variables_count: int = Field(default=0, description="Number of variables declared/used")
    loops_count: int = Field(default=0, description="Number of for/while loops")
    conditions_count: int = Field(default=0, description="Number of if/else/switch conditions")
    classes_count: int = Field(default=0, description="Number of classes defined")
    time_complexity: str = Field(default="O(1)", description="Time complexity in Big-O notation, e.g. O(1), O(n), O(n^2)")
    space_complexity: str = Field(default="O(1)", description="Space complexity in Big-O notation, e.g. O(1), O(n)")
    summary_what_it_does: str = Field(..., description="Plain-English explanation of what this entire program accomplishes in simple words")
    step_by_step_summary: List[str] = Field(default_factory=list, description="Simple high-level numbered steps (e.g., ['Step 1: Takes two numbers from user', 'Step 2: Adds them together', 'Step 3: Prints the sum'])")
    variables_breakdown: List[str] = Field(default_factory=list, description="Simple breakdown of each variable and its purpose")
    line_by_line_explanations: List[LineExplanation] = Field(default_factory=list, description="Line by line explanation of important lines")
    beginner_tips: List[str] = Field(default_factory=list, description="Helpful beginner tips, best practices, and suggestions")
    sample_input_output: Optional[str] = Field(default="", description="Simple example input and expected output")

def get_beginner_analysis(language: str, code: str, explanation_language: str = "en") -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    client = genai.Client(api_key=api_key)
    target_lang_name = SUPPORTED_HUMAN_LANGUAGES.get(explanation_language, "English")
    
    prompt = f"""
    You are an expert, friendly Programming Tutor dedicated to making coding crystal-clear for complete beginners.
    
    Analyze the following {language} code and generate a beginner-friendly code analysis and explanation.
    
    CRITICAL RULES FOR EXPLANATION:
    1. Use SIMPLE, EASY-TO-UNDERSTAND language in {target_lang_name}.
    2. Avoid dense academic jargon. (For example, say "The loop checks each number one by one" instead of "The iteration traverses the collection").
    3. If any technical term like 'modulo', 'recursion', or 'pointer' is mentioned, explain it immediately with a simple analogy.
    4. Provide realistic Time and Space complexity (e.g., O(1), O(n)) and explain what it means simply.
    5. Provide line-by-line simple explanations for important lines.
    
    Code to analyze:
    ```{language}
    {code}
    ```
    """
    
    try:
        raw_json = generate_with_fallback(
            client=client,
            prompt=prompt,
            schema=BeginnerAnalysisResult,
            mime_type="application/json"
        )
        return json.loads(raw_json)
    except Exception as e:
        print(f"Error in get_beginner_analysis: {e}")
        return {"error": f"Analysis failed: {str(e)}"}
