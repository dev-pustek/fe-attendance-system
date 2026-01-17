import toast from 'react-hot-toast';

/**
 * Backend error response structure
 */
interface BackendError {
  statusCode?: number;
  timestamp?: string;
  path?: string;
  message?: string;
  error?: string;
}

/**
 * Extract error message from backend error response
 * Handles both structured error objects and plain error messages
 */
export const extractErrorMessage = (error: any): string => {
  // If error is a string, return it directly
  if (typeof error === 'string') {
    return error;
  }

  // Handle Axios error response
  if (error?.response?.data) {
    const data = error.response.data as BackendError;
    
    // Return the message field if it exists
    if (data.message) {
      return data.message;
    }
    
    // Fallback to error field
    if (data.error) {
      return data.error;
    }
  }

  // Handle direct error object
  if (error?.message) {
    return error.message;
  }

  // Default fallback
  return 'An unexpected error occurred';
};

/**
 * Show success toast notification
 */
export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#10b981',
      color: '#fff',
      fontWeight: '500',
      zIndex: 999999,
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10b981',
    },
  });
};

/**
 * Show error toast notification with backend error extraction
 */
export const showError = (error: any, fallbackMessage?: string) => {
  const message = extractErrorMessage(error) || fallbackMessage || 'An error occurred';
  
  toast.error(message, {
    duration: 5000,
    position: 'top-right',
    style: {
      background: '#ef4444',
      color: '#fff',
      fontWeight: '500',
      zIndex: 999999,
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#ef4444',
    },
  });
};

/**
 * Show loading toast notification
 * Returns toast ID for updating/dismissing later
 */
export const showLoading = (message: string = 'Loading...') => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      background: '#3b82f6',
      color: '#fff',
      fontWeight: '500',
    },
  });
};

/**
 * Show info toast notification
 */
export const showInfo = (message: string) => {
  toast(message, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
      fontWeight: '500',
    },
  });
};

/**
 * Dismiss a specific toast by ID
 */
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

/**
 * Promise-based toast for async operations
 * Automatically shows loading, success, or error based on promise result
 */
export const showPromiseToast = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error?: string | ((error: any) => string);
  }
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: (err) => {
        if (typeof messages.error === 'function') {
          return messages.error(err);
        }
        return extractErrorMessage(err) || messages.error || 'Operation failed';
      },
    },
    {
      position: 'top-right',
      style: {
        fontWeight: '500',
      },
      success: {
        style: {
          background: '#10b981',
          color: '#fff',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#10b981',
        },
      },
      error: {
        style: {
          background: '#ef4444',
          color: '#fff',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#ef4444',
        },
      },
    }
  );
};
