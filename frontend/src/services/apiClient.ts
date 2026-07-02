// T024: API client with JWT interceptor
import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

console.log('[API Client] Initializing with baseURL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let accessToken: string | null = null;
let onTokenRefreshed: ((user: unknown) => void) | null = null;

export function setAccessToken(token: string | null) {
  console.log('[API Client] Setting access token:', token ? 'Token set' : 'Token cleared');
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setOnTokenRefreshed(cb: ((user: unknown) => void) | null) {
  onTokenRefreshed = cb;
}

// Request interceptor: attach JWT
apiClient.interceptors.request.use((config) => {
  console.log('[API Request]', config.method?.toUpperCase(), config.url);
  if (accessToken) {
    console.log('[API Request] Adding Authorization header');
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: handle 401 with silent refresh
apiClient.interceptors.response.use(
  (response) => {
    console.log('[API Response] Success:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error('[API Response] Error:', error.response?.status, error.config?.url, error.message);
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        console.log('[API Client] Attempting token refresh...');
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        console.log('[API Client] Token refresh successful');
        setAccessToken(data.access_token);
        if (data.user && onTokenRefreshed) {
          onTokenRefreshed(data.user);
        }
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('[API Client] Token refresh failed:', refreshError);
        setAccessToken(null);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
