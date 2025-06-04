
import axios, { AxiosError } from 'axios';
import { APIResponse } from '@college-erp/common';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api', // Ensure this var is set in .env.local if different
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token if available
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') { // Ensure localStorage is available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// Add a response interceptor to handle API errors globally or specific statuses
apiClient.interceptors.response.use(
  (response) => response, // Simply return the response if it's successful
  (error: AxiosError<APIResponse<null>>) => { // Type the error response data
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', error.response.data);
      if (error.response.status === 401) {
        // Handle unauthorized errors, e.g., redirect to login
        // This might be better handled in AuthContext or by specific queries
        if (typeof window !== 'undefined') {
            console.log("API returned 401, potentially redirecting to login.");
            // localStorage.removeItem('authToken');
            // localStorage.removeItem('authUser');
            // window.location.href = '/login'; // Hard redirect, or use router
        }
      }
      // You can throw a new error or return a modified error object
      // For react-query, it's often better to let it handle the error object.
      return Promise.reject(error.response.data || error); 
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API No Response:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);


export default apiClient;
