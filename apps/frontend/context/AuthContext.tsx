
'use client';
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserPayload, LoginResponse } from '@college-erp/common';
import apiClient from '@/lib/apiClient'; // Assuming an axios instance setup
import { useRouter } from 'next/navigation'; // Using App Router's navigation

interface AuthContextType {
  user: UserPayload | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadAuthData = useCallback(() => {
    setIsLoading(true);
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUserString = localStorage.getItem('authUser');
      if (storedToken && storedUserString) {
        const storedUser = JSON.parse(storedUserString) as UserPayload;
        setToken(storedToken);
        setUser(storedUser);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error("Failed to load auth data from localStorage:", error);
      // Clear potentially corrupted data
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuthData();
  }, [loadAuthData]);

  const login = async (usernameInput: string, passwordInput: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        username: usernameInput,
        password: passwordInput,
      });
      const { token: newToken, user: newUser } = response.data.data!; // Assert data is present on success
      
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('authUser', JSON.stringify(newUser));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      router.push('/dashboard');
    } catch (error) {
      console.error("Login failed:", error);
      // Let UI handle error display through react-query or local state in login form
      throw error; // Re-throw for the form to catch
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    delete apiClient.defaults.headers.common['Authorization'];
    router.push('/login');
  }, [router]);

  const isAuthenticated = useCallback(() => {
    return !!token && !!user;
  }, [token, user]);

  // Handle token expiry by checking on API calls or using a JWT decode library
  // For simplicity, this example doesn't include advanced token refresh/expiry logic

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
