// lib/tokenManager.ts
// NOTE: This is kept for backward compatibility, but NextAuth session should be the primary source

export const TokenManager = {
  // These methods are kept for any legacy code, but NextAuth session is preferred
  setTokens: (accessToken: string, refreshToken?: string) => {
    if (typeof window !== 'undefined') {
      console.warn('TokenManager.setTokens is deprecated. Use NextAuth session instead.');
      localStorage.setItem('access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
    }
  },

  getAccessToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  },

  getRefreshToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  },

  clearTokens: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // Also clear any legacy user data
      localStorage.removeItem('pairupUser');
    }
  },

  hasToken: (): boolean => {
    return !!TokenManager.getAccessToken();
  }
};