/**
 * Student Dashboard Logic - Complete
 * Handles all student interactions
 */

// State
let currentAssignments = [];
let currentSubmissions = [];
let currentFilter = 'all';
let searchTerm = '';

/**
 * Load student dashboard
 */
async function loadStudentDashboard() {
    try {
        // Display user info
        const userName = document.getElementById('user-name');
        const userRole = document.getElementById('user-role');
        if (userName) userName.textContent = api.user?.username || 'Student';
        if (userRole) userRole.textContent = api.user?.role || 'student';
        
        // Load assignments and submissions
        await Promise.all([
            loadAssignments(),
            loadSubmissions(),
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
 * Load student's submissions
 */
async function loadSubmissions() {
    try {
        const data = await api.getMySubmissions();
        currentSubmissions = data.submissions || [];
        renderSubmissions();
    } catch (error) {
        console.error('Error loading submissions:', error);
    }
}

/**
 * Load statistics
 */
async function loadStats() {
    try {
        const data = await api.getMySubmissionStats();
        const stats = data.statistics || {};
        
        document.getElementById('total-assignments').textContent = currentAssignments.length || 0;
        document.getElementById('submitted-count').textContent = stats.total_submissions || 0;
        document.getElementById('pending-count').textContent = stats.ungraded || 0;
        document.getElementById('average-grade').textContent = stats.average_grade ? `${stats.average_grade.toFixed(1)}%` : 'N/A';
        
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
    
    // Filter by status
    if (currentFilter === 'upcoming') {
        filtered = filtered.filter(a => !isPastDue(a.due_date));
    } else if (currentFilter === 'past') {
        filtered = filtered.filter(a => isPastDue(a.due_date));
    } else if (currentFilter === 'submitted') {
        filtered = filtered.filter(a => a.submitted);
    } else if (currentFilter === 'ungraded') {
        filtered = filtered.filter(a => a.submitted && a.grade === null);
    }
    
    // Filter by search
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(a => 
            a.title.toLowerCase().includes(term) ||
            (a.description && a.description.toLowerCase().includes(term))
        );
    }
    
    // Sort by due date
    filtered.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No assignments found</p>
                <p class="text-muted">Check back later for new assignments</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(assignment => 
        createAssignmentCard(assignment)
    ).join('');
}

/**
 * Render submissions
 */
function renderSubmissions() {
    const container = document.getElementById('submissions-container');
    if (!container) return;
    
    if (currentSubmissions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>You haven't submitted any assignments yet</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="table-container">
            <table class="submissions-table">
                <thead>
                    <tr>
                        <th>Assignment</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Grade</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    currentSubmissions.forEach(submission => {
        const isPast = isPastDue(submission.assignment_due_date);
        const canUpdate = !isPast && submission.grade === null;
        
        html += `
            <tr>
                <td><strong>${submission.assignment_title}</strong></td>
                <td>${formatDate(submission.submitted_at)}</td>
                <td>
                    ${submission.grade !== null ? 
                        `<span class="badge badge-success">Graded</span>` :
                        `<span class="badge badge-warning">Pending</span>`
                    }
                </td>
                <td>
                    ${submission.grade !== null ? 
                        `<span class="${getGradeColor(submission.grade)}">${submission.grade}% (${getGradeLetter(submission.grade)})</span>` :
                        '<span class="text-muted">Not graded</span>'
                    }
                </td>
                <td>
                    ${canUpdate ? `
                        <button onclick="editSubmission(${submission.id})" class="btn btn-sm btn-primary">Edit</button>
                        <button onclick="deleteSubmission(${submission.id})" class="btn btn-sm btn-danger">Delete</button>
                    ` : ''}
                    ${submission.file_url ? `
                        <a href="${submission.file_url}" target="_blank" class="btn btn-sm btn-info">View File</a>
                    ` : ''}
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
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
    
    // Search input
    const searchInput = document.getElementById('search-assignments');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            renderAssignments();
        });
    }
    
    // My submissions link
    const submissionsLink = document.getElementById('my-submissions-link');
    if (submissionsLink) {
        submissionsLink.addEventListener('click', (e) => {
            e.preventDefault();
            const section = document.getElementById('my-submissions-section');
            const assignmentsSection = document.querySelector('.assignments-grid');
            
            if (section && assignmentsSection) {
                if (section.style.display === 'none') {
                    section.style.display = 'block';
                    assignmentsSection.style.display = 'none';
                    e.target.textContent = 'Assignments';
                } else {
                    section.style.display = 'none';
                    assignmentsSection.style.display = 'grid';
                    e.target.textContent = 'My Submissions';
                }
            }
        });
    }
}

/**
 * Edit submission
 */
async function editSubmission(submissionId) {
    // Find submission
    const submission = currentSubmissions.find(s => s.id === submissionId);
    if (!submission) return;
    
    const newContent = prompt('Update your submission content:', submission.content || '');
    if (newContent === null) return; // User cancelled
    
    try {
        const formData = new FormData();
        formData.append('content', newContent);
        
        const data = await api.updateSubmission(submissionId, formData);
        showToast('Submission updated successfully!', 'success');
        await loadSubmissions();
        await loadAssignments();
    } catch (error) {
        showToast('Failed to update submission: ' + error.message, 'error');
    }
}

/**
 * Delete submission
 */
async function deleteSubmission(submissionId) {
    if (!confirm('Are you sure you want to delete this submission? This cannot be undone.')) return;
    
    try {
        await api.deleteSubmission(submissionId);
        showToast('Submission deleted successfully!', 'success');
        await loadSubmissions();
        await loadAssignments();
    } catch (error) {
        showToast('Failed to delete submission: ' + error.message, 'error');
    }
}

// Load dashboard when page loads
document.addEventListener('DOMContentLoaded', loadStudentDashboard);