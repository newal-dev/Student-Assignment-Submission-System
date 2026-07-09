/**
 * Teacher Dashboard Logic - Complete
 * Handles all teacher interactions
 */

// State
let currentAssignments = [];
let currentReminders = [];
let currentFilter = 'all';
let currentGradingSubmissionId = null;
let currentEditingAssignmentId = null;

/**
 * Load teacher dashboard
 */
async function loadTeacherDashboard() {
    try {
        // Display user info
        const userName = document.getElementById('user-name');
        if (userName) userName.textContent = api.user?.username || 'Teacher';
        
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
        const stats = data.dashboard?.overall_stats || {};
        
        document.getElementById('total-assignments').textContent = data.dashboard?.total_assignments || 0;
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
    if (!container) return;
    
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
                <p>No assignments found</p>
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
                    <span class="due-date">Due: ${formatDateOnly(assignment.due_date)}</span>
                    <span class="submissions-count">${assignment.submission_count || 0} submissions</span>
                    <span class="graded-count">${assignment.graded_count || 0} graded</span>
                </div>
                <div class="assignment-actions">
                    <button onclick="viewAssignmentDetails(${assignment.id})" class="btn btn-sm btn-primary">
                        View Details
                    </button>
                    ${!hasSubmissions ? `
                        <button onclick="editAssignment(${assignment.id})" class="btn btn-sm btn-secondary">
                            Edit
                        </button>
                        <button onclick="deleteAssignment(${assignment.id})" class="btn btn-sm btn-danger">
                            Delete
                        </button>
                    ` : `
                        <span class="badge badge-info">Has submissions - cannot delete</span>
                    `}
                    <button onclick="viewSubmissions(${assignment.id})" class="btn btn-sm btn-success">
                        View Submissions
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
    if (!container) return;
    
    if (currentReminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No reminders. All students have submitted their work.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentReminders.map(reminder => `
        <div class="reminder-card">
            <div class="reminder-header">
                <h4>${reminder.assignment_title}</h4>
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
    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) {
        filterStatus.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            renderAssignments();
        });
    }
    
    // Create assignment link
    const createLink = document.getElementById('create-assignment-link');
    if (createLink) {
        createLink.addEventListener('click', (e) => {
            e.preventDefault();
            showCreateAssignment();
        });
    }
    
    // Grade submissions link
    const gradeLink = document.getElementById('grade-submissions-link');
    if (gradeLink) {
        gradeLink.addEventListener('click', (e) => {
            e.preventDefault();
            const container = document.getElementById('assignments-container');
            if (container) {
                container.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    // Create assignment form
    const createForm = document.getElementById('create-assignment-form');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateAssignment);
    }
    
    // Grade form
    const gradeForm = document.getElementById('grade-form');
    if (gradeForm) {
        gradeForm.addEventListener('submit', handleGradeSubmission);
    }
}

/**
 * Show create assignment modal
 */
function showCreateAssignment() {
    const modal = document.getElementById('create-assignment-modal');
    if (!modal) return;
    
    currentEditingAssignmentId = null;
    document.getElementById('assignment-modal-title').textContent = 'Create New Assignment';
    document.getElementById('assignment-submit-btn').textContent = 'Create Assignment';
    document.getElementById('create-assignment-form').reset();
    
    // Set default due date (1 week from now)
    const date = new Date();
    date.setDate(date.getDate() + 7);
    const dueDateInput = document.getElementById('assignment-due-date');
    if (dueDateInput) {
        dueDateInput.value = date.toISOString().split('T')[0];
    }
    
    modal.style.display = 'block';
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
        if (currentEditingAssignmentId) {
            await api.updateAssignment(currentEditingAssignmentId, { title, description, due_date });
            showToast('Assignment updated successfully!', 'success');
        } else {
            await api.createAssignment({ title, description, due_date });
            showToast('Assignment created successfully!', 'success');
        }
        currentEditingAssignmentId = null;
        closeModal('create-assignment-modal');
        document.getElementById('create-assignment-form').reset();
        await loadAssignments();
        await loadStats();
    } catch (error) {
        const action = currentEditingAssignmentId ? 'update' : 'create';
        showToast(`Failed to ${action} assignment: ` + error.message, 'error');
    }
}

/**
 * Close modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
    if (modalId === 'create-assignment-modal') {
        currentEditingAssignmentId = null;
    }
}

/**
 * View assignment analytics/details
 */
async function viewAssignmentDetails(id) {
    const assignment = currentAssignments.find(a => a.id === id);
    
    try {
        const data = await api.getAssignmentAnalytics(id);
        const stats = data.analytics || {};
        
        const summary = [
            `Assignment: ${assignment ? assignment.title : id}`,
            `Total submissions: ${stats.total_submissions ?? 'N/A'}`,
            `Graded: ${stats.graded ?? 'N/A'}`,
            `Average grade: ${stats.average_grade !== undefined && stats.average_grade !== null ? stats.average_grade + '%' : 'N/A'}`,
            `Highest grade: ${stats.highest_grade ?? 'N/A'}`,
            `Lowest grade: ${stats.lowest_grade ?? 'N/A'}`
        ].join('\n');
        
        alert(summary);
    } catch (error) {
        showToast('Failed to load assignment details: ' + error.message, 'error');
    }
}

/**
 * View submissions for a specific assignment
 */
async function viewSubmissions(assignmentId) {
    const container = document.getElementById('assignments-container');
    if (!container) return;
    
    const assignment = currentAssignments.find(a => a.id === assignmentId);
    showLoading('assignments-container');
    
    try {
        const data = await api.getAssignmentSubmissions(assignmentId);
        const submissions = data.submissions || [];
        
        if (submissions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No submissions yet for "${assignment ? assignment.title : 'this assignment'}"</p>
                    <button onclick="renderAssignments()" class="btn btn-secondary">Back to Assignments</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="submissions-view">
                <button onclick="renderAssignments()" class="btn btn-secondary" style="margin-bottom:1rem;">Back to Assignments</button>
                <h3>${assignment ? assignment.title : 'Submissions'}</h3>
                <div class="table-container">
                    <table class="submissions-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Submitted</th>
                                <th>File</th>
                                <th>Grade</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${submissions.map(s => createSubmissionRow(s)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        showToast('Failed to load submissions: ' + error.message, 'error');
        renderAssignments();
    }
}

/**
 * Open the grade modal for a specific submission
 */
async function gradeSubmission(submissionId) {
    try {
        const data = await api.getSubmission(submissionId);
        const submission = data.submission || data;
        currentGradingSubmissionId = submissionId;
        
        document.getElementById('grade-student-name').textContent = submission.student_name || 'Unknown';
        document.getElementById('grade-assignment-title').textContent = submission.assignment_title || 'Unknown';
        document.getElementById('grade-submission-date').textContent = formatDate(submission.submitted_at);
        
        const gradeInput = document.getElementById('grade-input');
        const feedbackInput = document.getElementById('feedback-input');
        gradeInput.value = (submission.grade !== null && submission.grade !== undefined) ? submission.grade : '';
        feedbackInput.value = submission.feedback || '';
        
        document.getElementById('grade-modal').style.display = 'block';
    } catch (error) {
        showToast('Failed to load submission: ' + error.message, 'error');
    }
}

/**
 * Handle grade form submission
 */
async function handleGradeSubmission(event) {
    event.preventDefault();
    if (!currentGradingSubmissionId) return;
    
    const grade = parseFloat(document.getElementById('grade-input').value);
    const feedback = document.getElementById('feedback-input').value;
    
    if (isNaN(grade) || grade < 0 || grade > 100) {
        showToast('Please enter a valid grade between 0 and 100', 'error');
        return;
    }
    
    try {
        await api.gradeSubmission(currentGradingSubmissionId, { grade, feedback });
        showToast('Grade submitted successfully!', 'success');
        closeModal('grade-modal');
        document.getElementById('grade-form').reset();
        currentGradingSubmissionId = null;
        await loadAssignments();
        await loadStats();
    } catch (error) {
        showToast('Failed to submit grade: ' + error.message, 'error');
    }
}

/**
 * Edit an existing assignment - opens the create/edit modal pre-filled
 */
function editAssignment(id) {
    const assignment = currentAssignments.find(a => a.id === id);
    if (!assignment) return;
    
    const modal = document.getElementById('create-assignment-modal');
    if (!modal) return;
    
    currentEditingAssignmentId = id;
    document.getElementById('assignment-modal-title').textContent = 'Edit Assignment';
    document.getElementById('assignment-submit-btn').textContent = 'Save Changes';
    
    document.getElementById('assignment-title').value = assignment.title;
    document.getElementById('assignment-description').value = assignment.description || '';
    document.getElementById('assignment-due-date').value = assignment.due_date ? assignment.due_date.split('T')[0] : '';
    
    modal.style.display = 'block';
}

/**
 * Delete an assignment
 */
async function deleteAssignment(id) {
    const assignment = currentAssignments.find(a => a.id === id);
    if (!confirm(`Delete "${assignment ? assignment.title : 'this assignment'}"? This cannot be undone.`)) return;
    
    try {
        await api.deleteAssignment(id);
        showToast('Assignment deleted successfully!', 'success');
        await loadAssignments();
        await loadStats();
    } catch (error) {
        showToast('Failed to delete assignment: ' + error.message, 'error');
    }
}

/**
 * Export grades for every assignment as CSV downloads
 */
async function exportAllGrades() {
    if (currentAssignments.length === 0) {
        showToast('No assignments to export', 'error');
        return;
    }
    
    try {
        for (const assignment of currentAssignments) {
            const response = await api.exportGrades(assignment.id);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${assignment.title.replace(/[^a-z0-9]/gi, '_')}_grades.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        }
        showToast('Grades exported successfully!', 'success');
    } catch (error) {
        showToast('Failed to export grades: ' + error.message, 'error');
    }
}

/**
 * Refresh the whole dashboard
 */
async function refreshDashboard() {
    showLoading('assignments-container');
    await Promise.all([loadAssignments(), loadReminders(), loadStats()]);
    showToast('Dashboard refreshed', 'success');
}

// Make functions globally available
window.showCreateAssignment = showCreateAssignment;
window.closeModal = closeModal;
window.viewAssignmentDetails = viewAssignmentDetails;
window.viewSubmissions = viewSubmissions;
window.gradeSubmission = gradeSubmission;
window.editAssignment = editAssignment;
window.deleteAssignment = deleteAssignment;
window.exportAllGrades = exportAllGrades;
window.refreshDashboard = refreshDashboard;
window.renderAssignments = renderAssignments;

// Load dashboard when page loads
document.addEventListener('DOMContentLoaded', loadTeacherDashboard);