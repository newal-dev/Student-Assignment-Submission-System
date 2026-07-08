/**
 * Teacher Dashboard Logic
 * Handles all teacher interactions
 */

// State
let currentAssignments = [];
let currentReminders = [];
let currentFilter = 'all';
let currentGradingSubmissionId = null;

/**
 * Load teacher dashboard
 */
async function loadTeacherDashboard() {
    try {
        // Display user info
        document.getElementById('user-name').textContent = api.user?.username || 'Teacher';
        
        // Load dashboard data
        await Promise.all([
            loadAssignments(),
            loadReminders(),
            loadStats()
        ]);
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard: ' + error.message, 'error');
    }
}

/**
 * Load assignments
 */
async function loadAssignments() {
    try {
        const data = await api.getAssignments();
        currentAssignments = data.assignments || [];
        renderAssignments();
    } catch (error) {
        console.error('Error loading assignments:', error);
        showToast('Failed to load assignments', 'error');
    }
}

/**
 * Load reminders
 */
async function loadReminders() {
    try {
        const data = await api.getGradingReminders();
        currentReminders = data.reminders || [];
        renderReminders();
    } catch (error) {
        console.error('Error loading reminders:', error);
    }
}

/**
 * Load statistics
 */
async function loadStats() {
    try {
        const data = await api.getGradingDashboard();
        const stats = data.dashboard.overall_stats || {};
        
        document.getElementById('total-assignments').textContent = data.dashboard.total_assignments || 0;
        document.getElementById('total-submissions').textContent = stats.total_submissions || 0;
        document.getElementById('graded-count').textContent = stats.graded || 0;
        document.getElementById('average-grade').textContent = stats.average_grade ? `${stats.average_grade}%` : 'N/A';
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

/**
 * Render assignments
 */
function renderAssignments() {
    const container = document.getElementById('assignments-container');
    
    // Filter assignments
    let filtered = [...currentAssignments];
    
    if (currentFilter === 'upcoming') {
        filtered = filtered.filter(a => !isPastDue(a.due_date));
    } else if (currentFilter === 'past') {
        filtered = filtered.filter(a => isPastDue(a.due_date));
    } else if (currentFilter === 'has-submissions') {
        filtered = filtered.filter(a => a.submission_count > 0);
    } else if (currentFilter === 'no-submissions') {
        filtered = filtered.filter(a => !a.submission_count || a.submission_count === 0);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>📭 No assignments found</p>
                <button onclick="showCreateAssignment()" class="btn btn-primary">Create Your First Assignment</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(assignment => {
        const isPast = isPastDue(assignment.due_date);
        const hasSubmissions = assignment.submission_count > 0;
        
        return `
            <div class="assignment-card teacher-card">
                <div class="assignment-header">
                    <h3>${assignment.title}</h3>
                    <span class="assignment-status ${isPast ? 'status-past' : 'status-upcoming'}">
                        ${isPast ? 'Past Due' : 'Upcoming'}
                    </span>
                </div>
                <p class="assignment-description">${assignment.description || 'No description'}</p>
                <div class="assignment-meta">
                    <span class="due-date">📅 Due: ${formatDateOnly(assignment.due_date)}</span>
                    <span class="submissions-count">📤 ${assignment.submission_count || 0} submissions</span>
                    <span class="graded-count">✅ ${assignment.graded_count || 0} graded</span>
                </div>
                <div class="assignment-actions">
                    <button onclick="viewAssignmentDetails(${assignment.id})" class="btn btn-sm btn-primary">
                        📊 View Details
                    </button>
                    ${!hasSubmissions ? `
                        <button onclick="editAssignment(${assignment.id})" class="btn btn-sm btn-secondary">
                            ✏️ Edit
                        </button>
                        <button onclick="deleteAssignment(${assignment.id})" class="btn btn-sm btn-danger">
                            🗑️ Delete
                        </button>
                    ` : `
                        <span class="badge badge-info">💡 Has submissions - cannot delete</span>
                    `}
                    <button onclick="viewSubmissions(${assignment.id})" class="btn btn-sm btn-success">
                        📝 View Submissions
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render reminders
 */
function renderReminders() {
    const container = document.getElementById('reminders-container');
    
    if (currentReminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>✅ No reminders! All students have submitted their work.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentReminders.map(reminder => `
        <div class="reminder-card">
            <div class="reminder-header">
                <h4>📋 ${reminder.assignment_title}</h4>
                <span class="badge badge-warning">${reminder.missing_count} missing submissions</span>
            </div>
            <p>Due: ${formatDateOnly(reminder.due_date)}</p>
            <p>${reminder.submitted_count}/${reminder.total_students} students submitted</p>
            <details>
                <summary>View missing students (${reminder.missing_count})</summary>
                <ul>
                    ${reminder.missing_students.map(s => `
                        <li>${s.name} (${s.email})</li>
                    `).join('')}
                </ul>
            </details>
        </div>
    `).join('');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Filter dropdown
    document.getElementById('filter-status').addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderAssignments();
    });
    
    // Create assignment link
    document.getElementById('create-assignment-link').addEventListener('click', (e) => {
        e.preventDefault();
        showCreateAssignment();
    });
    
    // Grade submissions link
    document.getElementById('grade-submissions-link').addEventListener('click', (e) => {
        e.preventDefault();
        const container = document.getElementById('assignments-container');
        container.scrollIntoView({ behavior: 'smooth' });
    });
    
    // Create assignment form
    document.getElementById('create-assignment-form').addEventListener('submit', handleCreateAssignment);
    
    // Grade form
    document.getElementById('grade-form').addEventListener('submit', handleGradeSubmission);
}

/**
 * Show create assignment modal
 */
function showCreateAssignment() {
    // Set default due date (1 week from now)
    const date = new Date();
    date.setDate(date.getDate() + 7);
    document.getElementById('assignment-due-date').value = date.toISOString().split('T')[0];
    
    document.getElementById('create-assignment-modal').style.display = 'block';
}

/**
 * Handle create assignment
 */
async function handleCreateAssignment(event) {
    event.preventDefault();
    
    const title = document.getElementById('assignment-title').value;
    const description = document.getElementById('assignment-description').value;
    const due_date = document.getElementById('assignment-due-date').value;
    
    try {
        await api.createAssignment({ title, description, due_date });
        showToast('Assignment created successfully!', 'success');
        closeModal('create-assignment-modal');
        document.getElementById('create-assignment-form').reset();
        await loadAssignments();
        await loadStats();
    } catch (error) {
        showToast('Failed to create assignment: ' + error.message, 'error');
    }
}

/**
 * Edit assignment
 */
async function editAssignment(assignmentId) {
    const assignment = currentAssignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    const newTitle = prompt('Update title:', assignment.title);
    if (newTitle === null) return;
    
    const newDescription = prompt('Update description:', assignment.description || '');
    if (newDescription === null) return;
    
    const newDueDate = prompt('Update due date (YYYY-MM-DD):', assignment.due_date);
    if (newDueDate === null) return;
    
    try {
        await api.updateAssignment(assignmentId, {
            title: newTitle,
            description: newDescription,
            due_date: newDueDate
        });
        showToast('Assignment updated successfully!', 'success');
        await loadAssignments();
    } catch (error) {
        showToast('Failed to update assignment: ' + error.message, 'error');
    }
}

/**
 * Delete assignment
 */
async function deleteAssignment(assignmentId) {
    if (!confirm('Are you sure you want to delete this assignment? This cannot be undone.')) return;
    
    try {
        await api.deleteAssignment(assignmentId);
        showToast('Assignment deleted successfully!', 'success');
        await loadAssignments();
        await loadStats();
    } catch (error) {
        if (error.message.includes('submissions')) {
            if (confirm('This assignment has submissions. Force delete them all?')) {
                try {
                    await api.delete(`/assignments/${assignmentId}/force`);
                    showToast('Assignment and all submissions deleted!', 'success');
                    await loadAssignments();
                    await loadStats();
                } catch (forceError) {
                    showToast('Failed to delete: ' + forceError.message, 'error');
                }
            }
        } else {
            showToast('Failed to delete assignment: ' + error.message, 'error');
        }
    }
}

/**
 * View assignment details
 */
async function viewAssignmentDetails(assignmentId) {
    try {
        const data = await api.getAssignmentAnalytics(assignmentId);
        const analytics = data.analytics;
        
        let message = `📊 Assignment: ${analytics.assignment.title}\n`;
        message += `Total Submissions: ${analytics.submission_stats.total}\n`;
        message += `Graded: ${analytics.submission_stats.graded}\n`;
        message += `Ungraded: ${analytics.submission_stats.ungraded}\n`;
        message += `Average Grade: ${analytics.grade_stats.average}\n`;
        message += `Highest: ${analytics.grade_stats.highest}\n`;
        message += `Lowest: ${analytics.grade_stats.lowest}\n\n`;
        message += `Grade Distribution:\n`;
        message += `A: ${analytics.grade_distribution['A (90-100)']}\n`;
        message += `B: ${analytics.grade_distribution['B (80-89)']}\n`;
        message += `C: ${analytics.grade_distribution['C (70-79)']}\n`;
        message += `D: ${analytics.grade_distribution['D (60-69)']}\n`;
        message += `F: ${analytics.grade_distribution['F (0-59)']}\n`;
        
        alert(message);
    } catch (error) {
        showToast('Failed to load analytics: ' + error.message, 'error');
    }
}

/**
 * View submissions for an assignment
 */
async function viewSubmissions(assignmentId) {
    try {
        const data = await api.get(`/assignments/${assignmentId}/submissions`);
        const submissions = data.submissions || [];
        
        if (submissions.length === 0) {
            showToast('No submissions yet for this assignment', 'info');
            return;
        }
        
        // Show in a modal or alert
        let message = `📤 Submissions for Assignment ${data.assignment.title}\n\n`;
        submissions.forEach((s, i) => {
            message += `${i+1}. ${s.student_name || 'Unknown'}: `;
            message += s.grade !== null ? `${s.grade}%` : 'Not graded';
            message += '\n';
        });
        message += `\nStatistics:\n`;
        message += `Total: ${data.statistics.total}\n`;
        message += `Graded: ${data.statistics.graded}\n`;
        message += `Ungraded: ${data.statistics.ungraded}\n`;
        message += `Average: ${data.statistics.average_grade.toFixed(1)}%\n`;
        
        alert(message);
    } catch (error) {
        showToast('Failed to load submissions: ' + error.message, 'error');
    }
}

/**
 * Grade submission
 */
function gradeSubmission(submissionId) {
    currentGradingSubmissionId = submissionId;
    document.getElementById('grade-modal').style.display = 'block';
    document.getElementById('grade-input').value = '';
    document.getElementById('feedback-input').value = '';
    document.getElementById('grade-student-name').textContent = 'Loading...';
    document.getElementById('grade-assignment-title').textContent = 'Loading...';
    document.getElementById('grade-submission-date').textContent = 'Loading...';
    
    // Load submission details
    loadSubmissionDetails(submissionId);
}

/**
 * Load submission details for grading
 */
async function loadSubmissionDetails(submissionId) {
    try {
        const data = await api.getSubmission(submissionId);
        const submission = data.submission;
        
        document.getElementById('grade-student-name').textContent = submission.student_name || 'Unknown';
        document.getElementById('grade-assignment-title').textContent = submission.assignment_title || 'Unknown';
        document.getElementById('grade-submission-date').textContent = formatDate(submission.submitted_at);
        
        if (submission.grade !== null) {
            document.getElementById('grade-input').value = submission.grade;
        }
        if (submission.feedback) {
            document.getElementById('feedback-input').value = submission.feedback;
        }
    } catch (error) {
        showToast('Failed to load submission details: ' + error.message, 'error');
    }
}

/**
 * Handle grade submission
 */
async function handleGradeSubmission(event) {
    event.preventDefault();
    
    const grade = parseFloat(document.getElementById('grade-input').value);
    const feedback = document.getElementById('feedback-input').value;
    
    if (isNaN(grade) || grade < 0 || grade > 100) {
        showToast('Please enter a valid grade between 0 and 100', 'error');
        return;
    }
    
    try {
        await api.gradeSubmission(currentGradingSubmissionId, { grade, feedback });
        showToast('Submission graded successfully!', 'success');
        closeModal('grade-modal');
        await loadAssignments();
        await loadStats();
    } catch (error) {
        showToast('Failed to grade submission: ' + error.message, 'error');
    }
}

/**
 * Export all grades
 */
async function exportAllGrades() {
    try {
        const assignments = currentAssignments;
        if (assignments.length === 0) {
            showToast('No assignments to export', 'warning');
            return;
        }
        
        // Export each assignment
        for (const assignment of assignments) {
            const response = await api.exportGrades(assignment.id);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `grades-${assignment.title}-${Date.now()}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        }
        showToast('Grades exported successfully!', 'success');
    } catch (error) {
        showToast('Failed to export grades: ' + error.message, 'error');
    }
}

/**
 * Refresh dashboard
 */
async function refreshDashboard() {
    showToast('Refreshing dashboard...', 'info');
    await loadAssignments();
    await loadReminders();
    await loadStats();
    showToast('Dashboard refreshed!', 'success');
}

/**
 * Close modal
 */
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Load dashboard when page loads
document.addEventListener('DOMContentLoaded', loadTeacherDashboard);