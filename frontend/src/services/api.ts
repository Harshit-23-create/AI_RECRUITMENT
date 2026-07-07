import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

// ─── Auth Token Injection ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── 401 Auto-logout ─────────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const login = async (credentials: { email: string; password: string }) => {
  const response = await api.post('/auth/login', credentials);
  const data = response.data;
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
};

export const register = async (userData: any) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/auth/users');
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data;
};

// ─── Jobs ────────────────────────────────────────────────────────────────────
export const getJobs = async () => {
  const response = await api.get('/jobs/');
  return response.data;
};

export const createJob = async (jobData: any) => {
  const response = await api.post('/jobs/', jobData);
  return response.data;
};

export const deleteJob = async (id: number) => {
  await api.delete(`/jobs/${id}`);
};

// ─── Candidates ───────────────────────────────────────────────────────────────
export const getCandidates = async () => {
  const response = await api.get('/candidates/');
  return response.data;
};

export const getMyProfile = async () => {
  const response = await api.get('/candidates/me');
  return response.data;
};

export const updateMyProfile = async (profileData: any) => {
  const response = await api.patch('/candidates/me', profileData);
  return response.data;
};

export const uploadResume = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/candidates/me/upload-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// ─── Applications ────────────────────────────────────────────────────────────
export const getApplications = async () => {
  const response = await api.get('/applications/');
  return response.data;
};

export const createApplication = async (jobId: number) => {
  const response = await api.post('/applications/', { job_id: jobId });
  return response.data;
};

export const updateApplicationStatus = async (id: number, status: string) => {
  const response = await api.patch(`/applications/${id}/status?status=${status}`);
  return response.data;
};

export const deleteApplication = async (id: number) => {
  await api.delete(`/applications/${id}`);
};

// ─── Hiring Stages ─────────────────────────────────────────────────────────────
export const getStages = async () => {
  const response = await api.get('/stages/');
  return response.data;
};

export const createStage = async (stageData: any) => {
  const response = await api.post('/stages/', stageData);
  return response.data;
};

export const updateStage = async (id: number, stageData: any) => {
  const response = await api.patch(`/stages/${id}`, stageData);
  return response.data;
};

export const deleteStage = async (id: number) => {
  await api.delete(`/stages/${id}`);
};

// ─── Interviews ────────────────────────────────────────────────────────────────
export const getInterviews = async () => {
  const response = await api.get('/interviews/');
  return response.data;
};

export const scheduleInterview = async (interviewData: any) => {
  const response = await api.post('/interviews/', interviewData);
  return response.data;
};

export const updateInterview = async (id: number, interviewData: any) => {
  const response = await api.patch(`/interviews/${id}`, interviewData);
  return response.data;
};

export const deleteInterview = async (id: number) => {
  await api.delete(`/interviews/${id}`);
};

// ─── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = async () => {
  const response = await api.get('/notifications/');
  return response.data;
};

export const markNotificationRead = async (id: number) => {
  const response = await api.post(`/notifications/${id}/read`);
  return response.data;
};

// ─── AI Recruiter Chat ──────────────────────────────────────────────────────────
export const submitChatQuery = async (query: string) => {
  const response = await api.post('/dashboard/ai-chat', { query });
  return response.data;
};

export default api;
