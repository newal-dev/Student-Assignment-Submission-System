/**
 * Authentication Logic - Complete
 * Handles login, registration, session management, and logout
 */

/**
 * Check if user is logged in and redirect accordingly
 */
function checkAuth() {
    const isLoggedIn = api.isAuthenticated();
    const user = api.user;
    
    // Pages that don't require authentication
    const publicPages = ['/login.html', '/register.html', '/index.html', '/'];
    
    const currentPage = window.location.pathname;
    
    // If not logged in and on protected page, redirect to login
    if (!isLoggedIn) {
        if (!publicPages.includes(currentPage)) {
            window.location.href = '/login.html';
        }
        return;
    }
    
    // If logged in and on public page (except index), redirect to appropriate dashboard
    if (publicPages.includes(currentPage) && currentPage !== '/index.html' && currentPage !== '/') {
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
        return;
    }
    
    if (currentPage.includes('student') && user.role !== 'student') {
        window.location.href = '/teacher-dashboard.html';
        return;
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('general-error');
    const submitBtn = document.querySelector('#login-btn') || document.querySelector('button[type="submit"]');
    
    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
    }
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }
    
    try {
        const data = await api.login(email, password);
        
        // Show success message
        showToast('Login successful! Redirecting...', 'success');
        
        // Redirect based on role
        setTimeout(() => {
            if (data.user.role === 'teacher') {
                window.location.href = '/teacher-dashboard.html';
            } else {
                window.location.href = '/student-dashboard.html';
            }
        }, 500);
        
    } catch (error) {
        if (errorElement) {
            errorElement.textContent = error.message || 'Login failed. Please try again.';
            errorElement.classList.add('show');
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
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
    const errorElement = document.getElementById('general-error');
    const submitBtn = document.querySelector('#register-btn') || document.querySelector('button[type="submit"]');
    
    // Validate passwords match
    if (password !== confirmPassword) {
        if (errorElement) {
            errorElement.textContent = 'Passwords do not match';
            errorElement.classList.add('show');
        }
        return;
    }
    
    // Validate password strength
    if (password.length < 6) {
        if (errorElement) {
            errorElement.textContent = 'Password must be at least 6 characters';
            errorElement.classList.add('show');
        }
        return;
    }
    
    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
    }
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }
    
    try {
        const data = await api.register(username, email, password, role);
        
        showToast('Account created successfully! Redirecting...', 'success');
        
        setTimeout(() => {
            if (data.user.role === 'teacher') {
                window.location.href = '/teacher-dashboard.html';
            } else {
                window.location.href = '/student-dashboard.html';
            }
        }, 500);
        
    } catch (error) {
        if (errorElement) {
            errorElement.textContent = error.message || 'Registration failed. Please try again.';
            errorElement.classList.add('show');
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    }
}

/**
 * Handle logout
 */
function handleLogout(event) {
    if (event) event.preventDefault();
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

// Make functions globally available for inline onclick handlers
window.handleLogout = handleLogout;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;