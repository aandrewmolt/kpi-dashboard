import { API_BASE_URL } from '../config';

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: any,
    message?: string
  ) {
    super(message || 'API Error');
    this.name = 'ApiError';
  }
}

interface RequestConfig extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

const defaultConfig: RequestConfig = {
  retries: 3,
  retryDelay: 1000,
};

export async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const mergedConfig = { ...defaultConfig, ...config };
  const { retries, retryDelay, ...fetchConfig } = mergedConfig;
  
  let lastError: ApiError | null = null;
  
  for (let attempt = 0; attempt <= retries!; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchConfig,
        headers: {
          'Content-Type': 'application/json',
          ...fetchConfig.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError(
          response.status,
          errorData,
          errorData?.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as ApiError;
      
      if (attempt < retries!) {
        console.warn(`API request failed, retrying (${attempt + 1}/${retries})...`, error);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError || new Error('Request failed');
}

export const api = {
  get: <T>(endpoint: string, config?: RequestConfig) => 
    apiRequest<T>(endpoint, { ...config, method: 'GET' }),
    
  post: <T>(endpoint: string, data: any, config?: RequestConfig) =>
    apiRequest<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  put: <T>(endpoint: string, data: any, config?: RequestConfig) =>
    apiRequest<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    
  delete: <T>(endpoint: string, config?: RequestConfig) =>
    apiRequest<T>(endpoint, { ...config, method: 'DELETE' }),
};

// Error message mapping
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.data?.error || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Loading state helper
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export const initialLoadingState: LoadingState = {
  isLoading: false,
  error: null,
}; 