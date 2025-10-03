// API Configuration
const API_BASE_URL = 'http://16.171.24.58/api';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: boolean;
  message: string;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      user_type: string;
      createdAt: string;
    };
    token: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  user_type: string;
  createdAt: string;
}

// API Service Class
class ApiService {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.loadAuthToken();
  }

  // Load auth token from localStorage
  private loadAuthToken() {
    this.authToken = localStorage.getItem('auth_token');
  }

  // Set auth token
  public setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('auth_token', token);
  }

  // Remove auth token
  public removeAuthToken() {
    this.authToken = null;
    localStorage.removeItem('auth_token');
  }

  // Get auth token
  public getAuthToken(): string | null {
    return this.authToken;
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return !!this.authToken;
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        ...options.headers,
      },
      mode: 'cors', // Enable CORS for remote API
      credentials: 'omit', // Don't send cookies
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP error! status: ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth API Methods
  public async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Handle your API response format
    if (response.success && response.data?.status && response.data?.data?.token) {
      this.setAuthToken(response.data.data.token);
    }

    return response;
  }

  public async logout(): Promise<ApiResponse> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    this.removeAuthToken();
    return response;
  }

  // Token verification can be added later if needed
  // public async verifyToken(): Promise<ApiResponse<{ user: User }>> {
  //   return this.request<{ user: User }>('/auth/verify');
  // }

  // Token refresh can be added later if needed
  // public async refreshToken(): Promise<ApiResponse<LoginResponse>> {
  //   return this.request<LoginResponse>('/auth/refresh');
  // }

  // Template API Methods
  public async getTemplates(): Promise<ApiResponse<any[]>> {
    return this.request('/templates');
  }

  public async saveTemplate(template: any): Promise<ApiResponse<any>> {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  // New save template method with thumbnail generation
  public async saveTemplateWithThumbnail(
    template: any, 
    thumbnailBlob: Blob
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    
    // Add template data as JSON
    formData.append('name', template.name);
    formData.append('description', template.preview || '');
    formData.append('template_json', JSON.stringify(template));
    
    // Add thumbnail image as FormData
    formData.append('thumbnail_image', thumbnailBlob, 'template-preview.png');

    const url = `${this.baseURL}/templates`;
    
    const config: RequestInit = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        // Don't set Content-Type for FormData - let browser set it with boundary
      },
      mode: 'cors',
      credentials: 'omit',
      body: formData,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP error! status: ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  public async updateTemplate(id: string, template: any): Promise<ApiResponse<any>> {
    return this.request(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  public async deleteTemplate(id: string): Promise<ApiResponse> {
    return this.request(`/templates/${id}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types for use in components
export type { ApiResponse, LoginRequest, LoginResponse, User };
