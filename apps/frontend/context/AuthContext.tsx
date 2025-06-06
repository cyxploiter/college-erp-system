
'use client';
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserPayload, LoginResponse } from '@college-erp/common';
import apiClient from '@/lib/apiClient'; 
import { useRouter } from 'next/navigation'; 

interface AuthContextType {
  user: UserPayload | null;
  token: string | null;
  isLoading: boolean;
  login: (identifierInput: string, passwordInput: string) => Promise<void>;
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
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuthData();
  }, [loadAuthData]);

  const login = async (identifierInput: string, passwordInput: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        identifier: identifierInput,
        password: passwordInput,
      });
      const { token: newToken, user: newUser } = response.data.data!; 
      
      setToken(newToken);
      setUser(newUser); // newUser is of type UserPayload from common types
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('authUser', JSON.stringify(newUser));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      // router.push('/dashboard'); // Removed: LoginPage will handle redirect based on state
    } catch (error) {
      console.error("Login failed:", error);
      throw error; 
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

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
