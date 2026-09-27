import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Attach Authorization Bearer token to all requests if user is logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('codeguardian_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ----------------- AUTH APIS -----------------
export const registerUser = async (username, email, password) => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

export const loginUser = async (username_or_email, password) => {
  const response = await api.post('/auth/login', { username_or_email, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await api.put('/auth/profile', profileData);
  return response.data;
};

// ----------------- PRACTICE QUESTIONS -----------------
export const getQuestions = async () => {
  const response = await api.get('/questions');
  return response.data;
};

export const getQuestionById = async (qid) => {
  const response = await api.get(`/questions/${qid}`);
  return response.data;
};

// ----------------- SAVED PROGRAMS -----------------
export const getSavedPrograms = async () => {
  const response = await api.get('/saved-programs');
  return response.data;
};

export const saveProgram = async (programData) => {
  const response = await api.post('/saved-programs', programData);
  return response.data;
};

export const updateSavedProgram = async (pid, updateData) => {
  const response = await api.put(`/saved-programs/${pid}`, updateData);
  return response.data;
};

export const deleteSavedProgram = async (pid) => {
  const response = await api.delete(`/saved-programs/${pid}`);
  return response.data;
};

// ----------------- PRACTICE HISTORY -----------------
export const getPracticeHistory = async () => {
  const response = await api.get('/practice-history');
  return response.data;
};

// ----------------- EXECUTION & ANALYSIS -----------------
export const executeCode = async (language, code, standardInput = '', question_name = '', file_name = '') => {
  const response = await api.post('/execute', { language, code, standardInput, question_name, file_name });
  return response.data;
};

export const analyzeCode = async (language, code, explanationLanguage = 'en') => {
  const response = await api.post('/analyze', { language, code, explanationLanguage });
  return response.data;
};

// ----------------- AI REVIEW, CHAT & TRANSLATION -----------------
export const reviewCode = async (language, code, explanationLanguage = 'en', standardInput = '') => {
  const response = await api.post('/review', { language, code, explanationLanguage, standardInput });
  return response.data;
};

export const chatWithBot = async (messages, code, language, explanationLanguage = 'en', reviewContext = {}) => {
  const response = await api.post('/chat', {
    messages,
    code,
    language,
    explanationLanguage,
    reviewContext,
  });
  return response.data;
};

export const translateCode = async (code, targetLanguage, sourceLanguage = 'python', explanationLanguage = 'en') => {
  const response = await api.post('/translate', { code, targetLanguage, sourceLanguage, explanationLanguage });
  return response.data;
};

export const getWalkthrough = async (language, code, explanationLanguage = 'en') => {
  const response = await api.post('/walkthrough', { language, code, explanationLanguage });
  return response.data;
};

export const getHistory = async () => {
  const response = await api.get('/history');
  return response.data;
};

export default api;
