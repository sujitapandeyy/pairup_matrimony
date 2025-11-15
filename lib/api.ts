import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';
import { TokenManager } from './tokenManager';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050',
  withCredentials: true,
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  async (config) => {
    let token = null;

    // Try to get token from localStorage first (faster)
    token = TokenManager.getAccessToken();

    // If not in localStorage, try to get from session
    if (!token) {
      const session = await getSession();
      
      // Check if session has error (token refresh failed)
      if (session?.error === "RefreshAccessTokenError") {
        console.error("Session has refresh error, signing out...");
        TokenManager.clearTokens();
        await signOut({ redirect: true, callbackUrl: '/login' });
        return Promise.reject(new Error("Session expired"));
      }
      
      token = session?.accessToken || null;
      
      // Store in localStorage for future requests
      if (token) {
        TokenManager.setTokens(token, session?.refreshToken);
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to get a fresh token from session (this will trigger token refresh in NextAuth)
        const session = await getSession();
        
        // If session has refresh error, sign out
        if (session?.error === "RefreshAccessTokenError") {
          console.error("Token refresh failed, signing out...");
          TokenManager.clearTokens();
          await signOut({ redirect: true, callbackUrl: '/login' });
          return Promise.reject(error);
        }
        
        if (session?.accessToken) {
          TokenManager.setTokens(session.accessToken, session.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
          return api(originalRequest);
        }

        // If no session, clear tokens and redirect to login
        TokenManager.clearTokens();
        await signOut({ redirect: true, callbackUrl: '/login' });
      } catch (err) {
        console.error("Error handling 401:", err);
        TokenManager.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export const SOCKET_SERVER = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';

export default api;