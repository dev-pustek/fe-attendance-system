import apiClient from "../client";
import { AuthResponse, User } from "../types";
import { BaseResponse } from "../types/common";
import { useAuthStore } from "../../store/authStore";

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    
    const { user, accessToken, refreshToken } = response.data;
    useAuthStore.getState().setAuth(user, accessToken, refreshToken);
    
    return response.data;
  },

  studentLogin: async (nis: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/student-login", {
      nis,
      password,
    });
    
    const { user: initialUser, accessToken, refreshToken } = response.data;
    
    // Set initial auth to allow authorized requests
    useAuthStore.getState().setAuth(initialUser, accessToken, refreshToken);
    
    try {
        // Fetch full profile to get userTypes and other details
        // The apiClient interceptor unwraps the response, so 'me' is the User object directly (or nested if not unwrapped correctly, but we assume unwrapped based on client.ts)
        const meResponse = await apiClient.get<BaseResponse<User>>("/users/me");
        const fullUser = meResponse.data as unknown as User; // Type assertion since interceptor unwraps it
        
        // Update store with full user data
        useAuthStore.getState().setAuth(fullUser, accessToken, refreshToken);
        
        // Return full user in the response
        return {
            ...response.data,
            user: fullUser
        };
    } catch (error) {
        console.error("Failed to fetch full profile after login", error);
        // Fallback to initial user if me fails
        return response.data;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      useAuthStore.getState().logout();
    }
  },

  me: async (): Promise<BaseResponse<User>> => {
    const response = await apiClient.get<BaseResponse<User>>("/users/me");
    return response.data;
  },
};
