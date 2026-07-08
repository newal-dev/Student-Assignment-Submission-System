/**
 * Authentication Logic
 * Handles login, registration, and session management
 */

/**
 * Check if user is logged in and redirect accordingly
 */
function checkAuth() {
    const isLoggedIn = api.isAuthenticated();
    const user = api.user;
    
    // Pages that don't require authentication
    const publicPages = ['/login.html', '/register.html', '/'];
    
    const currentPage = window.location.pathname;
    
    if (!isLoggedIn) {
        // If on protected page, redirect to login
        if (!publicPages.includes(currentPage)) {
            window.location.href = '/login.html';
        }
        return;
    }
    
    // If logged in and on public page, redirect to appropriate dashboard
    if (publicPages.includes(currentPage)) {
        if (user.role === 'teacher') {
            window.location.href = '/teacher-dashboard.html';
        } else {
            window.location.href = '/student-dashboard.html';
        }
        return;
    }
    
    // Verify user has access to current page
    if (currentPage.includes('teacher') && user.role !== 'teacher') {
        window.location.href = '/student-dashboard.html';
    }
    
    if (currentPage.includes('student') && user.role !== 'student') {
        window.location.href = '/teacher-dashboard.html';
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('error-message');
    const submitBtn = document.querySelector('button[type="submit"]');
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    errorElement.textContent = '';
    
    try {
        const data = await api.login(email, password);
        
        // Redirect based on role
        if (data.user.role === 'teacher') {
            window.location.href = '/teacher-dashboard.html';
        } else {
            window.location.href = '/student-dashboard.html';
        }
    } catch (error) {
        errorElement.textContent = error.message || 'Login failed. Please try again.';
        errorElement.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
}

/**
 * Handle registration form submission
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const role = document.getElementById('role').value;
    const errorElement = document.getElementById('error-message');
    const submitBtn = document.querySelector('button[type="submit"]');
    
    // Validate passwords match
    if (password !== confirmPassword) {
        errorElement.textContent = 'Passwords do not match';
        errorElement.style.display = 'block';
        return;
    }
    
    // Validate password strength
    if (password.length < 6) {
        errorElement.textContent = 'Password must be at least 6 characters';
        errorElement.style.display = 'block';
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
    errorElement.textContent = '';
    
    try {
        const data = await api.register(username, email, password, role);
        
        // Redirect based on role
        if (data.user.role === 'teacher') {
            window.location.href = '/teacher-dashboard.html';
        } else {
            window.location.href = '/student-dashboard.html';
        }
    } catch (error) {
        errorElement.textContent = error.message || 'Registration failed. Please try again.';
        errorElement.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
}

/**
 * Handle logout
 */
function handleLogout(event) {
    event.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        api.logout();
    }
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication status
    checkAuth();
    
    // Setup login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Setup registration form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Setup logout buttons
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });
});