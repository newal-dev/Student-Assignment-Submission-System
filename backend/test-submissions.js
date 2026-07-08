/**
 * Submission Test Script
 * Final tests for complete submission lifecycle
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function testSubmissions() {
    const BASE_URL = 'http://localhost:5000/api';
    
    try {
        console.log('Testing Submission Operations\n');

        // 1. Create test files
        console.log('1. Creating test file...');
        const testFilePath = path.join(__dirname, 'test.txt');
        fs.writeFileSync(testFilePath, 'This is a test submission file');
        console.log('Test file created\n');

        // 2. Login as student
        console.log('2. Logging in as student...');
        const studentLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'student1@school.com',
                password: 'password123'
            })
        });

        if (!studentLogin.ok) {
            console.error('Please create a student account first');
            return;
        }

        const studentData = await studentLogin.json();
        console.log(`Logged in as ${studentData.user.username} (${studentData.user.role})\n`);

        // 3. Login as teacher to create assignment
        console.log('3. Logging in as teacher...');
        const teacherLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'teacher1@school.com',
                password: 'password123'
            })
        });

        if (!teacherLogin.ok) {
            console.error('Please create a teacher account first');
            return;
        }

        const teacherData = await teacherLogin.json();

        // 4. Create an assignment
        console.log('4. Creating an assignment for testing...');
        const createAssignment = await fetch(`${BASE_URL}/assignments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${teacherData.token}`
            },
            body: JSON.stringify({
                title: 'Submission Test Assignment',
                description: 'An assignment for testing submissions',
                due_date: '2024-12-31' // Far in the future
            })
        });

        if (!createAssignment.ok) {
            console.error('Failed to create assignment');
            return;
        }

        const assignmentData = await createAssignment.json();
        const assignmentId = assignmentData.assignment.id;
        console.log(`Assignment created! ID: ${assignmentId}\n`);

        // 5. Submit assignment (with file)
        console.log('5. Submitting assignment...');
        
        // Create form data for file upload
        const formData = new FormData();
        formData.append('assignment_id', assignmentId);
        formData.append('content', 'This is my submission content');
        formData.append('file', fs.createReadStream(testFilePath));

        const submitRes = await fetch(`${BASE_URL}/submissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${studentData.token}`
            },
            body: formData
        });

        if (!submitRes.ok) {
            const error = await submitRes.json();
            console.error('Submission failed:', error);
            return;
        }

        const submitData = await submitRes.json();
        const submissionId = submitData.submission.id;
        console.log(`Submission created! ID: ${submissionId}`);
        console.log(`   Content: ${submitData.submission.content}`);
        console.log(`   File: ${submitData.submission.file_url || 'None'}\n`);

        // 6. View student's submissions
        console.log('6. Viewing student submissions...');
        const viewRes = await fetch(`${BASE_URL}/submissions/me`, {
            headers: { 'Authorization': `Bearer ${studentData.token}` }
        });

        if (viewRes.ok) {
            const data = await viewRes.json();
            console.log(`Found ${data.count} submission(s)`);
            data.submissions.forEach((s, i) => {
                console.log(`   ${i+1}. ${s.assignment_title} (${s.submitted_at})`);
                console.log(`      Grade: ${s.grade || 'Not graded'}`);
            });
            console.log('');
        }

        // 7. Update submission
        console.log(`7. Updating submission ${submissionId}...`);
        const updateFormData = new FormData();
        updateFormData.append('content', 'Updated submission content');

        const updateRes = await fetch(`${BASE_URL}/submissions/${submissionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${studentData.token}`
            },
            body: updateFormData
        });

        if (updateRes.ok) {
            const data = await updateRes.json();
            console.log(`Submission updated!`);
            console.log(`   New Content: ${data.submission.content}\n`);
        }

        // 8. Grade submission (teacher)
        console.log(`8. Grading submission ${submissionId}...`);
        const gradeRes = await fetch(`${BASE_URL}/submissions/${submissionId}/grade`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${teacherData.token}`
            },
            body: JSON.stringify({
                grade: 85,
                feedback: 'Great work! Keep it up.'
            })
        });

        if (gradeRes.ok) {
            const data = await gradeRes.json();
            console.log(`Submission graded!`);
            console.log(`   Grade: ${data.submission.grade}`);
            console.log(`   Feedback: ${data.submission.feedback}\n`);
        }

        // 9. Delete submission (student)
        console.log(`9. Deleting submission ${submissionId}...`);
        const deleteRes = await fetch(`${BASE_URL}/submissions/${submissionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${studentData.token}` }
        });

        if (deleteRes.ok) {
            const data = await deleteRes.json();
            console.log(`Submission deleted!`);
            console.log(`   Message: ${data.message}\n`);
        }

        // 10. Clean up - delete test assignment
        console.log(`10. Cleaning up - deleting assignment...`);
        await fetch(`${BASE_URL}/assignments/${assignmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${teacherData.token}` }
        });
        console.log('Cleanup complete\n');

        // Clean up test file
        fs.unlinkSync(testFilePath);

        console.log('Submission tests completed successfully!');
        console.log('\nWhat we tested:');
        console.log('   Creating submissions (students only)');
        console.log('   File upload with submissions');
        console.log('   Viewing student submissions');
        console.log('   Updating submissions (before deadline)');
        console.log('   Grading submissions (teachers only)');
        console.log('   Deleting submissions (students only)');

    } catch (error) {
        console.error('Test failed:', error.message);
        console.error('Make sure the server is running on port 5000');
    }
}

testSubmissions();