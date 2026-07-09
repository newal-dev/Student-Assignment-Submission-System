/**
 * Utility Functions - Complete
 * Common helper functions used across the application
 */

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format date only (no time)
 */
function formatDateOnly(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Check if date is past due
 */
function isPastDue(dateString) {
    const now = new Date();
    const dueDate = new Date(dateString);
    return now > dueDate;
}

/**
 * Get grade letter from numeric grade
 */
function getGradeLetter(grade) {
    if (grade === null || grade === undefined) return 'N/A';
    if (grade >= 90) return 'A';
    if (grade >= 80) return 'B';
    if (grade >= 70) return 'C';
    if (grade >= 60) return 'D';
    return 'F';
}

/**
 * Get grade color based on grade
 */
function getGradeColor(grade) {
    if (grade === null || grade === undefined) return 'text-muted';
    if (grade >= 90) return 'text-success';
    if (grade >= 70) return 'text-primary';
    if (grade >= 60) return 'text-warning';
    return 'text-danger';
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        // Create container if it doesn't exist
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
            <button type="button" class="toast-close" onclick="this.closest('.toast').remove()">&times;</button>
        </div>
        <div class="toast-body">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

/**
 * Show loading spinner
 */
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }
}

/**
 * Hide loading spinner and show content
 */
function hideLoading(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = content;
    }
}

/**
 * Create assignment card HTML
 */
function createAssignmentCard(assignment) {
    const isPast = isPastDue(assignment.due_date);
    const statusClass = isPast ? 'status-past' : 'status-upcoming';
    const statusText = isPast ? 'Past Due' : 'Upcoming';
    
    return `
        <div class="assignment-card ${isPast ? 'past-due' : ''}">
            <div class="assignment-header">
                <h3>${assignment.title}</h3>
                <span class="assignment-status ${statusClass}">${statusText}</span>
            </div>
            <p class="assignment-description">${assignment.description || 'No description'}</p>
            <div class="assignment-meta">
                <span class="due-date">Due: ${formatDateOnly(assignment.due_date)}</span>
                <span class="teacher">${assignment.teacher_name || 'Unknown Teacher'}</span>
            </div>
            ${assignment.submitted ? `
                <div class="submission-status">
                    <span class="badge badge-success">Submitted</span>
                    ${assignment.grade !== null ? `
                        <span class="badge ${getGradeColor(assignment.grade)}">
                            Grade: ${assignment.grade}% (${getGradeLetter(assignment.grade)})
                        </span>
                    ` : `
                        <span class="badge badge-warning">Awaiting Grade</span>
                    `}
                </div>
            ` : `
                ${!isPast ? `
                    <button onclick="window.location.href='/assignment-detail.html?id=${assignment.id}'" 
                            class="btn btn-primary btn-sm">
                        Submit Assignment
                    </button>
                ` : `
                    <span class="badge badge-secondary">Past Due</span>
                `}
            `}
        </div>
    `;
}

/**
 * Create submission row HTML for teachers
 */
function createSubmissionRow(submission) {
    const isGraded = submission.grade !== null;
    return `
        <tr>
            <td>${submission.student_name || 'Unknown'}</td>
            <td>${formatDate(submission.submitted_at)}</td>
            <td>
                ${submission.file_url ? `
                    <a href="${submission.file_url}" target="_blank" class="btn btn-sm btn-info">View File</a>
                ` : 'No file'}
            </td>
            <td>
                ${isGraded ? `
                    <span class="badge ${getGradeColor(submission.grade)}">
                        ${submission.grade}% (${getGradeLetter(submission.grade)})
                    </span>
                ` : `
                    <span class="badge badge-warning">Not Graded</span>
                `}
            </td>
            <td>
                <button onclick="gradeSubmission(${submission.id})" 
                        class="btn btn-sm btn-primary">
                    ${isGraded ? 'Update Grade' : 'Grade'}
                </button>
            </td>
        </tr>
    `;
}

// Make utilities globally available
window.formatDate = formatDate;
window.formatDateOnly = formatDateOnly;
window.isPastDue = isPastDue;
window.getGradeLetter = getGradeLetter;
window.getGradeColor = getGradeColor;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.createAssignmentCard = createAssignmentCard;
window.createSubmissionRow = createSubmissionRow;