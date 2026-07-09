/**
 * Assignment Detail Page Logic
 * Loads a single assignment (from ?id= in the URL) and lets the student submit to it
 */

let currentAssignment = null;

/**
 * Grab the assignment id from the query string, e.g. assignment-detail.html?id=12
 */
function getAssignmentIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadAssignmentDetail() {
    const id = getAssignmentIdFromUrl();
    const infoContainer = document.getElementById('assignment-info');

    // Guard: no id in the URL at all
    if (!id) {
        infoContainer.innerHTML = `<p class="text-danger">No assignment specified.</p>`;
        return;
    }

    try {
        const data = await api.getAssignment(id);
        currentAssignment = data.assignment;

        renderAssignmentInfo(currentAssignment);
        await checkSubmissionEligibility(currentAssignment);

    } catch (error) {
        // e.g. assignment doesn't exist -> backend returns 404 JSON, handled here (not a browser 404)
        infoContainer.innerHTML = `<p class="text-danger">Failed to load assignment: ${error.message}</p>`;
    }
}

function renderAssignmentInfo(assignment) {
    const infoContainer = document.getElementById('assignment-info');
    infoContainer.innerHTML = `
        <h1>${assignment.title}</h1>
        <p class="assignment-description">${assignment.description || 'No description provided'}</p>
        <p class="due-date">Due: ${formatDate(assignment.due_date)}</p>
        <p class="teacher">Assigned by: ${assignment.teacher_name || 'Unknown Teacher'}</p>
    `;
}

/**
 * Decide whether to show the submission form, or a status message instead
 * (already submitted / past due)
 */
async function checkSubmissionEligibility(assignment) {
    const formContainer = document.getElementById('submission-form-container');
    const statusMessage = document.getElementById('status-message');

    if (isPastDue(assignment.due_date)) {
        statusMessage.style.display = 'block';
        statusMessage.innerHTML = `<p class="text-danger">This assignment is past its due date and can no longer be submitted.</p>`;
        return;
    }

    // Check if the student already has a submission for this assignment
    const data = await api.getMySubmissions();
    const existing = (data.submissions || []).find(s => s.assignment_id === parseInt(assignment.id));

    if (existing) {
        statusMessage.style.display = 'block';
        statusMessage.innerHTML = `<p class="text-muted">You've already submitted this assignment. Edit it from your Dashboard's "My Submissions" section.</p>`;
        return;
    }

    // Eligible to submit -> show the form
    formContainer.style.display = 'block';
}

/**
 * Handle form submit: build FormData (so file upload works) and call the API
 */
async function handleSubmissionSubmit(e) {
    e.preventDefault();

    const content = document.getElementById('content').value.trim();
    const fileInput = document.getElementById('file');
    const file = fileInput.files[0];
    const submitBtn = document.getElementById('submit-btn');

    // Mirror the backend's own rule: need at least one of content or file
    if (!content && !file) {
        showToast('Please write something or attach a file before submitting.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('assignment_id', currentAssignment.id);
    if (content) formData.append('content', content);
    if (file) formData.append('file', file);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        await api.createSubmission(formData);
        showToast('Assignment submitted successfully!', 'success');
        // Send them back to the dashboard after a short pause so they see the toast
        setTimeout(() => {
            window.location.href = '/student-dashboard.html';
        }, 1200);
    } catch (error) {
        showToast('Submission failed: ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Assignment';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAssignmentDetail();
    document.getElementById('submission-form').addEventListener('submit', handleSubmissionSubmit);
});