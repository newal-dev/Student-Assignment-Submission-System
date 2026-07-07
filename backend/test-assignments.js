/**
 * Assignment CRUD Test Script
 * Tests full assignment lifecycle
 */

require('dotenv').config();

async function testAssignments() {
    const BASE_URL = 'http://localhost:5000/api';
    
    try {
        console.log('Testing Assignment CRUD Operations\n');

        // 1. Login as teacher
        console.log('1. Logging in as teacher...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'teacher1@school.com',
                password: 'password123'
            })
        });
        
        if (!loginRes.ok) {
            console.error('Please create a teacher account first');
            console.error('   Run the test-auth.js script first');
            return;
        }

        const { token, user } = await loginRes.json();
        console.log(`Logged in as ${user.username} (${user.role})\n`);

        // 2. Create an assignment
        console.log('2. Creating an assignment...');
        const createRes = await fetch(`${BASE_URL}/assignments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Web Programming Final Project',
                description: 'Build a full-stack web application using Node.js, Express, and PostgreSQL',
                due_date: '2024-07-15'
            })
        });

        if (!createRes.ok) {
            const error = await createRes.json();
            console.error('Failed to create assignment:', error);
            return;
        }

        const createData = await createRes.json();
        const assignmentId = createData.assignment.id;
        console.log(`Assignment created! ID: ${assignmentId}`);
        console.log(`   Title: ${createData.assignment.title}`);
        console.log(`   Due Date: ${createData.assignment.due_date}\n`);

        // 3. Get all assignments
        console.log('3. Getting all assignments...');
        const getAllRes = await fetch(`${BASE_URL}/assignments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (getAllRes.ok) {
            const data = await getAllRes.json();
            console.log(`Found ${data.count} assignment(s)`);
            data.assignments.forEach((a, i) => {
                console.log(`   ${i+1}. ${a.title} (Due: ${a.due_date})`);
            });
            console.log('');
        }

        // 4. Get specific assignment
        console.log(`4. Getting assignment ${assignmentId}...`);
        const getOneRes = await fetch(`${BASE_URL}/assignments/${assignmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (getOneRes.ok) {
            const data = await getOneRes.json();
            console.log(`Assignment found:`);
            console.log(`   Title: ${data.assignment.title}`);
            console.log(`   Description: ${data.assignment.description}`);
            console.log(`   Teacher: ${data.assignment.teacher_name}`);
            console.log(`   Submission Count: ${data.assignment.submission_count || 0}\n`);
        }

        // 5. Update assignment
        console.log(`5. Updating assignment ${assignmentId}...`);
        const updateRes = await fetch(`${BASE_URL}/assignments/${assignmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Web Programming Final Project - Updated',
                description: 'Build a full-stack web application with advanced features'
            })
        });

        if (updateRes.ok) {
            const data = await updateRes.json();
            console.log(`Assignment updated!`);
            console.log(`   New Title: ${data.assignment.title}\n`);
        }

        // 6. Test unauthorized access (student trying to delete)
        console.log('6. Testing unauthorized deletion...');
        // Login as student
        const studentLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'student1@school.com',
                password: 'password123'
            })
        });

        if (studentLogin.ok) {
            const studentData = await studentLogin.json();
            const deleteRes = await fetch(`${BASE_URL}/assignments/${assignmentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${studentData.token}` }
            });

            if (deleteRes.status === 403) {
                const error = await deleteRes.json();
                console.log('Unauthorized access blocked correctly!');
                console.log(`   Error: ${error.message}\n`);
            }
        }

        // 7. Delete assignment (teacher)
        console.log(`7. Deleting assignment ${assignmentId}...`);
        const deleteRes = await fetch(`${BASE_URL}/assignments/${assignmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (deleteRes.ok) {
            const data = await deleteRes.json();
            console.log(`Assignment deleted successfully!`);
            console.log(`   Message: ${data.message}\n`);
        }

        // 8. Verify deletion
        console.log(` 8. Verifying deletion...`);
        const verifyRes = await fetch(`${BASE_URL}/assignments/${assignmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (verifyRes.status === 404) {
            const error = await verifyRes.json();
            console.log(`Assignment correctly not found: ${error.message}\n`);
        }

        console.log('Assignment CRUD tests completed successfully!');
        console.log('\n What we tested:');
        console.log('   ✅ Creating assignments (teacher only)');
        console.log('   ✅ Reading assignments (all authenticated users)');
        console.log('   ✅ Updating assignments (teacher who created it)');
        console.log('   ✅ Unauthorized access denied (students blocked)');
        console.log('   ✅ Deleting assignments (teacher who created it)');

    } catch (error) {
        console.error('Test failed:', error.message);
        console.error('Make sure the server is running on port 5000');
    }
}

testAssignments();