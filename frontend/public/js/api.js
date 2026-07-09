/**
 * Final API Client - Complete
 * Handles all API communication with the backend
 * Includes authentication, assignments, submissions, and grading
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
                this.setToken(null);
                this.setUser(null);
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
     * File upload with PUT (for updates)
     */
    async uploadPut(endpoint, formData) {
        const headers = {};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: headers,
            body: formData
        });
        return this.handleResponse(response);
    }

    // AUTHENTICATION METHODS

    /**
     * Login user
     */
    async login(email, password) {
        const data = await this.post('/auth/login', { email, password });
        this.setToken(data.token);
        this.setUser(data.user);
        return data;
    }

    /**
     * Register user
     */
    async register(username, email, password, role = 'student') {
        const data = await this.post('/auth/register', { 
            username, email, password, role 
        });
        this.setToken(data.token);
        this.setUser(data.user);
        return data;
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            await this.post('/auth/logout', {});
        } catch (error) {
            // Ignore logout errors
        }
        this.setToken(null);
        this.setUser(null);
        window.location.href = '/login.html';
    }

    /**
     * Get current user profile
     */
    async getProfile() {
        return this.get('/auth/profile');
    }

    /**
     * Update user profile
     */
    async updateProfile(data) {
        return this.put('/auth/profile', data);
    }

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        return this.put('/auth/change-password', { currentPassword, newPassword });
    }

    // ASSIGNMENT METHODS

    /**
     * Get all assignments with filters
     */
    async getAssignments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.get(`/assignments${queryString ? '?' + queryString : ''}`);
    }

    /**
     * Get single assignment by ID
     */
    async getAssignment(id) {
        return this.get(`/assignments/${id}`);
    }

    /**
     * Create new assignment (teacher only)
     */
    async createAssignment(data) {
        return this.post('/assignments', data);
    }

    /**
     * Update assignment (teacher only)
     */
    async updateAssignment(id, data) {
        return this.put(`/assignments/${id}`, data);
    }

    /**
     * Delete assignment (teacher only)
     */
    async deleteAssignment(id) {
        return this.delete(`/assignments/${id}`);
    }

    /**
     * Force delete assignment with submissions (teacher only)
     */
    async forceDeleteAssignment(id) {
        return this.delete(`/assignments/${id}/force`);
    }

    /**
     * Get assignment statistics (teacher only)
     */
    async getAssignmentStatistics() {
        return this.get('/assignments/statistics');
    }

    // SUBMISSION METHODS
    /**
     * Create submission (student only)
     */
    async createSubmission(formData) {
        return this.upload('/submissions', formData);
    }

    /**
     * Get current user's submissions (student only)
     */
    async getMySubmissions() {
        return this.get('/submissions/me');
    }

    /**
     * Get submission statistics for current user (student only)
     */
    async getMySubmissionStats() {
        return this.get('/submissions/me/stats');
    }

    /**
     * Get single submission by ID
     */
    async getSubmission(id) {
        return this.get(`/submissions/${id}`);
    }

    /**
     * Update submission (student only, before deadline)
     */
    async updateSubmission(id, formData) {
        return this.uploadPut(`/submissions/${id}`, formData);
    }

    /**
     * Delete submission (student only, before deadline)
     */
    async deleteSubmission(id) {
        return this.delete(`/submissions/${id}`);
    }

    /**
     * Get submissions for an assignment (teacher only)
     */
    async getAssignmentSubmissions(assignmentId) {
        return this.get(`/assignments/${assignmentId}/submissions`);
    }

    // Grading Methods

    /**
     * Get grading dashboard (teacher only)
     */
    async getGradingDashboard() {
        return this.get('/grading/dashboard');
    }

    /**
     * Get assignment analytics (teacher only)
     */
    async getAssignmentAnalytics(id) {
        return this.get(`/grading/assignments/${id}/analytics`);
    }

    /**
     * Grade a submission (teacher only)
     */
    async gradeSubmission(id, data) {
        return this.put(`/grading/submissions/${id}`, data);
    }

    /**
     * Batch grade submissions (teacher only)
     */
    async batchGrade(data) {
        return this.post('/grading/batch', data);
    }

    /**
     * Get grading reminders (teacher only)
     */
    async getGradingReminders() {
        return this.get('/grading/reminders');
    }

    /**
     * Export grades as CSV (teacher only)
     */
    async exportGrades(id) {
        const response = await fetch(`${API_BASE_URL}/grading/assignments/${id}/export`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to export grades');
        }
        
        return response;
    }

    /**
     * Get student performance (teacher only)
     */
    async getStudentPerformance(studentId) {
        return this.get(`/grading/students/${studentId}/performance`);
    }
}

// Create a global instance
const api = new ApiClient();

// Make it available globally
window.api = api;