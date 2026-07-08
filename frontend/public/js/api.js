/**
 * Is the API Client
 * Handles all API communication with the backend
 * Centralizes authentication and error handling
 */

const API_BASE_URL = 'http://localhost:5000/api';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    /**
     * Set user data
     */
    setUser(user) {
        this.user = user;
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Get authentication headers
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    /**
     * Handle API response
     */
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            // Handle authentication errors
            if (response.status === 401) {
                // Token expired or invalid
                this.setToken(null);
                this.setUser(null);
                // Redirect to login if not already there
                if (!window.location.pathname.includes('login') && 
                    !window.location.pathname.includes('register')) {
                    window.location.href = '/login.html';
                }
                throw new Error('Session expired. Please login again.');
            }
            
            throw new Error(data.message || data.error || 'An error occurred');
        }
        
        return data;
    }

    /**
     * GET request
     */
    async get(endpoint) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    /**
     * POST request
     */
    async post(endpoint, data) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    }

    /**
     * PUT request
     */
    async put(endpoint, data) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    /**
     * File upload request (multipart/form-data)
     */
    async upload(endpoint, formData) {
        const headers = {};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        return this.handleResponse(response);
    }

    /**
     * Auth endpoints
     */
    async login(email, password) {
        const data = await this.post('/auth/login', { email, password });
        this.setToken(data.token);
        this.setUser(data.user);
        return data;
    }

    async register(username, email, password, role = 'student') {
        const data = await this.post('/auth/register', { 
            username, email, password, role 
        });
        this.setToken(data.token);
        this.setUser(data.user);
        return data;
    }

    async logout() {
        this.setToken(null);
        this.setUser(null);
        window.location.href = '/login.html';
    }

    /**
     * Assignment endpoints
     */
    async getAssignments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/assignments${queryString ? '?' + queryString : ''}`);
    }

    async getAssignment(id) {
        return this.get(`/assignments/${id}`);
    }

    async createAssignment(data) {
        return this.post('/assignments', data);
    }

    async updateAssignment(id, data) {
        return this.put(`/assignments/${id}`, data);
    }

    async deleteAssignment(id) {
        return this.delete(`/assignments/${id}`);
    }

    /**
     * Submission endpoints
     */
    async getMySubmissions() {
        return this.get('/submissions/me');
    }

    async getSubmission(id) {
        return this.get(`/submissions/${id}`);
    }

    async createSubmission(formData) {
        return this.upload('/submissions', formData);
    }

    async updateSubmission(id, formData) {
        return this.upload(`/submissions/${id}`, formData);
    }

    async deleteSubmission(id) {
        return this.delete(`/submissions/${id}`);
    }

    /**
     * Grading endpoints (teacher only)
     */
    async getGradingDashboard() {
        return this.get('/grading/dashboard');
    }

    async getAssignmentAnalytics(id) {
        return this.get(`/grading/assignments/${id}/analytics`);
    }

    async gradeSubmission(id, data) {
        return this.put(`/grading/submissions/${id}`, data);
    }

    async batchGrade(data) {
        return this.post('/grading/batch', data);
    }

    async getGradingReminders() {
        return this.get('/grading/reminders');
    }

    async exportGrades(id) {
        const response = await fetch(`${API_BASE_URL}/grading/assignments/${id}/export`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return response;
    }
}

// Create a global instance
const api = new ApiClient();

// Make it available globally
window.api = api;