// API Base Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// API Client Class
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem('auth_token');
  }

  // Get default headers
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.includeAuth !== false),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle blob responses (for file downloads)
      if (options.responseType === 'blob') {
        if (!response.ok) {
          // Try to get error message from blob
          const errorText = await response.text();
          let errorMessage;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
          } catch {
            errorMessage = `HTTP error! status: ${response.status}`;
          }
          throw new Error(errorMessage);
        }
        return await response.blob();
      }
      
      // Handle regular JSON responses
      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.message || `HTTP error! status: ${response.status}`;
        
        // Extract more detailed error messages if available
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const detailedErrors = data.errors.map(err => err.msg || err.message).join(', ');
          errorMessage = detailedErrors || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  // POST request
  async post(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
  }

  // PUT request
  async put(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
  }

  // DELETE request
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }
}

// Create and export API client instance
export const apiClient = new ApiClient();

// Export API base URL for reference
export { API_BASE_URL }; 