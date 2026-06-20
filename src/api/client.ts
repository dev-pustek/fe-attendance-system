import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://103.6.207.34:8080/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Flag to track if we are currently refreshing the token
let isRefreshing = false;
// Queue to hold requests that failed while token was refreshing
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const fixImageUrls = (obj: any, origin: string): any => {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.includes('localhost:3000/uploads')) {
      return obj.replace(/http:\/\/localhost:3000/g, origin);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => fixImageUrls(item, origin));
  }
  // Ignore Blobs and ArrayBuffers
  if (obj instanceof Blob || obj instanceof ArrayBuffer) {
    return obj;
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = fixImageUrls(obj[key], origin);
    }
    return newObj;
  }
  return obj;
};

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    let responseData = response.data;
    
    // Auto-fix localhost:3000 image URLs from the backend when testing on mobile/VPS
    try {
      const origin = new URL(API_BASE_URL).origin;
      responseData = fixImageUrls(responseData, origin);
    } catch (e) {
      // Ignore URL parsing errors
    }

    // Automatically unwrap the 'data' property if it exists
    if (responseData && responseData.data !== undefined) {
      const { data, ...metadata } = responseData;
      
      // If there is metadata (like total, page, etc.) at the root level, 
      // we merge it with the data if data is an object, 
      // or return a combined object if data is an array.
      if (Object.keys(metadata).length > 0) {
        return {
          ...response,
          data: Array.isArray(data) 
            ? { data, ...metadata } // Paginated structure: { data: [], total: 10, ... }
            : { ...data, ...metadata } // Simple object with extra root fields
        };
      }

      return {
        ...response,
        data: data
      };
    }
    
    return {
      ...response,
      data: responseData
    };
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, add to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, logout, setAccessToken } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        // Attempt to refresh token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        // Handle possible wrapping in refresh response too
        const responseData = response.data.data !== undefined ? response.data.data : response.data;
        const { accessToken: newAccessToken } = responseData;
        
        setAccessToken(newAccessToken);
        
        processQueue(null, newAccessToken);
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
