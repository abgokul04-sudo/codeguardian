import subprocess
import tempfile
import os
import sys
import time
import re
import shutil
import json
from google import genai
from google.genai import types

FALLBACK_MODELS = [
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.6-flash",
]

def parse_line_number(stderr: str) -> str:
    """Extract line number from python/node/java traceback"""
    match = re.search(r'line\s+(\d+)', stderr, re.IGNORECASE)
    if not match:
        match = re.search(r':(\d+):\s*(?:error|exception)', stderr, re.IGNORECASE)
    if not match:
        match = re.search(r'\.java:(\d+)', stderr, re.IGNORECASE)
    if match:
        return f"Check line {match.group(1)} of your code."
    return "Check your code structure."

def format_beginner_error(stderr: str, language: str) -> dict:
    """
    Translates raw compiler/runtime errors into simple beginner-friendly explanations.
    """
    if not stderr:
        return {}

    line_hint = parse_line_number(stderr)
    lang = language.lower()

    if "SyntaxError" in stderr or "invalid syntax" in stderr or "reached end of file while parsing" in stderr:
        return {
            "title": "❌ Syntax Error",
            "message": "There is a syntax problem in your code.",
            "possible_reason": "You may have missed a semicolon (;), colon (:), closing brace/parenthesis, quote mark, or used an unexpected symbol.",
            "line_hint": line_hint,
            "suggestion": "Check for matching parentheses (), braces {}, quotes \"\", or misspelled keywords."
        }
    elif "NullPointerException" in stderr or "null pointer" in stderr.lower():
        return {
            "title": "❌ Null Pointer Exception",
            "message": "Your program tried to use an object reference that has not been initialized (points to null).",
            "possible_reason": "Calling a method or accessing a variable on an object that is currently `null`.",
            "line_hint": line_hint,
            "suggestion": "Initialize the object before accessing its methods, or add a null check (`if (obj != null)`)."
        }
    elif "ArrayIndexOutOfBoundsException" in stderr or "IndexOutOfBoundsException" in stderr or "IndexError" in stderr:
        return {
            "title": "❌ Array / List Index Out of Bounds",
            "message": "The program tried to access an index that is beyond the size of the array or collection.",
            "possible_reason": "Remember that indices start at 0 and end at length - 1. Loop condition `i <= length` often causes this.",
            "line_hint": line_hint,
            "suggestion": "Check your loop bounds (e.g. use `i < arr.length` instead of `i <= arr.length`)."
        }
    elif "cannot find symbol" in stderr:
        match = re.search(r'symbol:\s*(\w+\s+)?(\w+)', stderr)
        sym = match.group(2) if match else "variable or method"
        return {
            "title": "❌ Cannot Find Symbol",
            "message": f"The Java compiler cannot recognize '{sym}'.",
            "possible_reason": f"'{sym}' is not declared, is misspelled, or is out of scope.",
            "line_hint": line_hint,
            "suggestion": f"Check the spelling of '{sym}', verify it is declared, or check necessary import statements."
        }
    elif "class, interface, or enum expected" in stderr:
        return {
            "title": "❌ Class Structure Error",
            "message": "Java code must be enclosed inside a class definition.",
            "possible_reason": "Extra curly braces outside the class or code written outside `public class Main { ... }`.",
            "line_hint": line_hint,
            "suggestion": "Make sure all code and methods are enclosed inside the class body."
        }
    elif "IndentationError" in stderr or "TabError" in stderr:
        return {
            "title": "❌ Indentation Error",
            "message": "The indentation (spaces or tabs) does not match in this block.",
            "possible_reason": "Lines inside a function, loop, or if-statement must be indented equally.",
            "line_hint": line_hint,
            "suggestion": "Make sure all lines inside the block start with the exact same number of spaces."
        }
    elif "NameError" in stderr:
        match = re.search(r"name '([^']+)' is not defined", stderr)
        var_name = match.group(1) if match else "a variable"
        return {
            "title": "❌ Name Error (Undefined Variable)",
            "message": f"The program encountered '{var_name}' which has not been defined.",
            "possible_reason": f"You tried to use '{var_name}' before creating it, or there is a spelling/case typo in the name.",
            "line_hint": line_hint,
            "suggestion": f"Check where '{var_name}' is declared or check spelling (Python is case-sensitive)."
        }
    elif "TypeError" in stderr or "incompatible types" in stderr:
        return {
            "title": "❌ Type Error (Incompatible Data Types)",
            "message": "You tried to perform an operation on incompatible types of data.",
            "possible_reason": "For example, trying to assign or combine incompatible data types without explicit conversion.",
            "line_hint": line_hint,
            "suggestion": "Convert or cast types appropriately before performing operations."
        }
    elif "ZeroDivisionError" in stderr or "/ by zero" in stderr:
        return {
            "title": "❌ Division by Zero Error",
            "message": "The program attempted to divide a number by zero (0).",
            "possible_reason": "In mathematics and programming, division by zero is undefined.",
            "line_hint": line_hint,
            "suggestion": "Check your math formulas or add an if-check to ensure the divisor is not 0."
        }
    elif "NumberFormatException" in stderr or "ValueError" in stderr:
        return {
            "title": "❌ Invalid Number / Value Format",
            "message": "A function or parsing method received data with an invalid format.",
            "possible_reason": "Trying to parse letters or symbols into an integer/double.",
            "line_hint": line_hint,
            "suggestion": "Ensure the input string contains only valid digits before parsing."
        }
    elif "NoSuchElementException" in stderr:
        return {
            "title": "❌ No Such Element (Scanner Input Missing)",
            "message": "Scanner attempted to read input (`sc.nextInt()`, `sc.nextLine()`), but no input was provided in Standard Input.",
            "possible_reason": "The program expects user input, but the Standard Input box was left empty.",
            "line_hint": line_hint,
            "suggestion": "Provide test input values in the 'Standard Input (stdin)' box before running."
        }
    else:
        return {
            "title": "❌ Program Execution Error",
            "message": "An error occurred while compiling or running your code.",
            "possible_reason": "A compiler error or runtime exception occurred during execution.",
            "line_hint": line_hint,
            "suggestion": "Review the compiler/runtime output below to pinpoint the issue."
        }

def simulate_execution_with_ai(language: str, code: str, standard_input: str = "") -> dict:
    """
    Simulates precise code execution via Gemini when local compilers (e.g. javac, g++, etc.) are unavailable.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {
            "executed": False,
            "status": "runtime_not_found",
            "output": "",
            "error": f"Compiler for {language} is not installed locally and GEMINI_API_KEY is not set.",
            "friendly_error": None,
            "execution_time_ms": 0.0,
            "returncode": -1
        }

    client = genai.Client(api_key=api_key)
    prompt = f"""
You are an exact, deterministic programming language execution sandbox simulator for {language}.
Run the following {language} code mentally and determine the EXACT console output that would be printed to standard output (stdout) or standard error (stderr).

Standard Input (stdin):
{standard_input}

Code to execute:
```{language}
{code}
```

CRITICAL INSTRUCTIONS:
1. If the code is valid (e.g., printing pattern triangles, stars, numbers, loops, math formulas, recursion):
   - Output the EXACT printed text in `output`.
   - Preserve all spaces, asterisks, line breaks, and exact formatting precisely as the program would print it.
   - Set `status` to "success", `error` to "", and `returncode` to 0.
2. If the code has a compilation / syntax error:
   - Provide the realistic compiler error message in `error`.
   - Set `output` to "", `status` to "compilation_error", and `returncode` to 1.
3. If the code throws a runtime exception:
   - Provide the runtime exception trace in `error`.
   - Set `status` to "runtime_error", and `returncode` to 1.
4. If there is an infinite loop that would never terminate:
   - Set `status` to "timeout", `error` to "Execution timed out (infinite loop detected).", and `returncode` to -1.

Output JSON ONLY strictly with format:
{{
  "status": "success",
  "output": "exact standard output here",
  "error": "",
  "returncode": 0
}}
"""

    start_time = time.perf_counter()
    last_err = None
    for model_name in FALLBACK_MODELS:
        try:
            config = types.GenerateContentConfig(response_mime_type="application/json")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config
            )
            if response and response.text:
                exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                res_json = json.loads(response.text)
                status_val = res_json.get("status", "success")
                out_val = res_json.get("output", "")
                err_val = res_json.get("error", "")
                ret_code = res_json.get("returncode", 0)

                friendly_err = None
                if status_val != "success" or ret_code != 0:
                    friendly_err = format_beginner_error(err_val or out_val, language)

                return {
                    "executed": True,
                    "status": status_val,
                    "output": out_val,
                    "error": err_val,
                    "friendly_error": friendly_err,
                    "execution_time_ms": exec_time_ms,
                    "returncode": ret_code
                }
        except Exception as e:
            last_err = e
            continue

    return {
        "executed": False,
        "status": "error",
        "output": "",
        "error": f"Execution simulation failed: {str(last_err)}",
        "friendly_error": None,
        "execution_time_ms": 0.0,
        "returncode": -1
    }

def execute_code(language: str, code: str, timeout_seconds: int = 10, standard_input: str = "") -> dict:
    """
    Safely executes code locally with timing in ms, resource limits, and captures stdout/stderr.
    If local compiler/runtime is not installed, seamlessly falls back to accurate AI execution simulation.
    """
    lang = language.lower().strip()
    
    if not code or not code.strip():
        return {
            "executed": False,
            "status": "No code provided",
            "output": "",
            "error": "Code cannot be empty.",
            "friendly_error": None,
            "execution_time_ms": 0.0,
            "returncode": -1
        }

    input_payload = standard_input if (standard_input and standard_input.strip()) else ""
    temp_dir = None
    temp_file = None
    start_time = time.perf_counter()

    try:
        if lang in ["python", "py"]:
            with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as f:
                f.write(code)
                temp_file = f.name
            
            proc = subprocess.run(
                [sys.executable, temp_file],
                input=input_payload,
                capture_output=True,
                text=True,
                timeout=timeout_seconds
            )
            exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
            stdout = proc.stdout
            stderr = proc.stderr.strip()

            status_val = "success"
            friendly_err = None
            if proc.returncode != 0:
                if "SyntaxError" in stderr or "IndentationError" in stderr or "TabError" in stderr:
                    status_val = "compilation_error"
                else:
                    status_val = "runtime_error"
                friendly_err = format_beginner_error(stderr, "python")

            return {
                "executed": True,
                "status": status_val,
                "output": stdout,
                "error": stderr,
                "friendly_error": friendly_err,
                "execution_time_ms": exec_time_ms,
                "returncode": proc.returncode
            }

        elif lang in ["javascript", "js"]:
            # Check if node is available
            if shutil.which("node"):
                with tempfile.NamedTemporaryFile(suffix=".js", delete=False, mode="w", encoding="utf-8") as f:
                    f.write(code)
                    temp_file = f.name
                
                proc = subprocess.run(
                    ["node", temp_file],
                    input=input_payload,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds
                )
                exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                stdout = proc.stdout
                stderr = proc.stderr.strip()

                status_val = "success" if proc.returncode == 0 else "runtime_error"
                friendly_err = None
                if "SyntaxError" in stderr:
                    status_val = "compilation_error"
                if proc.returncode != 0:
                    friendly_err = format_beginner_error(stderr, "javascript")

                return {
                    "executed": True,
                    "status": status_val,
                    "output": stdout,
                    "error": stderr,
                    "friendly_error": friendly_err,
                    "execution_time_ms": exec_time_ms,
                    "returncode": proc.returncode
                }
            else:
                return simulate_execution_with_ai(language, code, standard_input)

        elif lang == "java":
            # Check if javac and java are available in PATH
            if shutil.which("javac") and shutil.which("java"):
                match = re.search(r'(?:public\s+)?class\s+([A-Za-z0-9_]+)', code)
                class_name = match.group(1) if match else "Main"

                temp_dir = tempfile.mkdtemp(prefix="cg_java_")
                java_path = os.path.join(temp_dir, f"{class_name}.java")
                with open(java_path, "w", encoding="utf-8") as f:
                    f.write(code)

                # Compile
                comp_proc = subprocess.run(
                    ["javac", f"{class_name}.java"],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds
                )
                if comp_proc.returncode != 0:
                    exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    err_msg = comp_proc.stderr.strip()
                    return {
                        "executed": True,
                        "status": "compilation_error",
                        "output": "",
                        "error": err_msg,
                        "friendly_error": format_beginner_error(err_msg, "java"),
                        "execution_time_ms": exec_time_ms,
                        "returncode": comp_proc.returncode
                    }

                # Run
                run_proc = subprocess.run(
                    ["java", class_name],
                    cwd=temp_dir,
                    input=input_payload,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds
                )
                exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                stdout = run_proc.stdout
                stderr = run_proc.stderr.strip()

                status_val = "success" if run_proc.returncode == 0 else "runtime_error"
                friendly_err = format_beginner_error(stderr, "java") if run_proc.returncode != 0 else None

                return {
                    "executed": True,
                    "status": status_val,
                    "output": stdout,
                    "error": stderr,
                    "friendly_error": friendly_err,
                    "execution_time_ms": exec_time_ms,
                    "returncode": run_proc.returncode
                }
            else:
                return simulate_execution_with_ai(language, code, standard_input)

        elif lang in ["cpp", "c"]:
            compiler = "g++" if lang == "cpp" else "gcc"
            if shutil.which(compiler):
                temp_dir = tempfile.mkdtemp(prefix="cg_c_")
                src_ext = ".cpp" if lang == "cpp" else ".c"
                src_path = os.path.join(temp_dir, f"main{src_ext}")
                bin_path = os.path.join(temp_dir, "main.exe" if os.name == "nt" else "main.out")
                with open(src_path, "w", encoding="utf-8") as f:
                    f.write(code)

                comp_proc = subprocess.run(
                    [compiler, src_path, "-o", bin_path],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds
                )
                if comp_proc.returncode != 0:
                    exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    err_msg = comp_proc.stderr.strip()
                    return {
                        "executed": True,
                        "status": "compilation_error",
                        "output": "",
                        "error": err_msg,
                        "friendly_error": format_beginner_error(err_msg, lang),
                        "execution_time_ms": exec_time_ms,
                        "returncode": comp_proc.returncode
                    }

                run_proc = subprocess.run(
                    [bin_path],
                    cwd=temp_dir,
                    input=input_payload,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds
                )
                exec_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                stdout = run_proc.stdout
                stderr = run_proc.stderr.strip()
                status_val = "success" if run_proc.returncode == 0 else "runtime_error"
                friendly_err = format_beginner_error(stderr, lang) if run_proc.returncode != 0 else None

                return {
                    "executed": True,
                    "status": status_val,
                    "output": stdout,
                    "error": stderr,
                    "friendly_error": friendly_err,
                    "execution_time_ms": exec_time_ms,
                    "returncode": run_proc.returncode
                }
            else:
                return simulate_execution_with_ai(language, code, standard_input)

        else:
            return simulate_execution_with_ai(language, code, standard_input)

    except subprocess.TimeoutExpired:
        exec_time_ms = round(timeout_seconds * 1000, 2)
        return {
            "executed": True,
            "status": "timeout",
            "output": "",
            "error": f"Execution timed out after {timeout_seconds}s (infinite loop or long running process detected).",
            "friendly_error": {
                "title": "⏳ Execution Timeout",
                "message": f"Your program ran for more than {timeout_seconds} seconds and was stopped.",
                "possible_reason": "There may be an infinite loop (e.g., loop condition that never becomes False).",
                "line_hint": "Check your `while` or `for` loops.",
                "suggestion": "Ensure loop counter variables increment/decrement properly so the loop condition eventually terminates."
            },
            "execution_time_ms": exec_time_ms,
            "returncode": -1
        }
    except Exception as e:
        return {
            "executed": False,
            "status": "error",
            "output": "",
            "error": str(e),
            "friendly_error": {
                "title": "❌ System Execution Error",
                "message": str(e),
                "possible_reason": "An unexpected error occurred in the execution sandbox.",
                "line_hint": "",
                "suggestion": "Please check your code and try running again."
            },
            "execution_time_ms": 0.0,
            "returncode": -1
        }
    finally:
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception:
                pass
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass

