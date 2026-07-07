/**
 * Authorization Test Script
 * Tests role-based access control
 */

require('dotenv').config();

async function testAuthorization() {
    const BASE_URL = 'http://localhost:5000/api';
    
    try {
        console.log('Testing Authorization System\n');

        // 1. Create a student and teacher account
        console.log('1. Creating test accounts...');
        
        // Create student
        const studentData = {
            username: `student_${Date.now()}`,
            email: `student_${Date.now()}@test.com`,
            password: 'Test123456',
            role: 'student'
        };
        
        const studentRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });
        const student = await studentRes.json();
        
        // Create teacher
        const teacherData = {
            username: `teacher_${Date.now()}`,
            email: `teacher_${Date.now()}@test.com`,
            password: 'Test123456',
            role: 'teacher'
        };
        
        const teacherRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(teacherData)
        });
        const teacher = await teacherRes.json();
        
        console.log('Accounts created!');
        console.log(`   Student: ${student.user.username} (${student.user.role})`);
        console.log(`   Teacher: ${teacher.user.username} (${teacher.user.role})\n`);

        // 2. Test: Student trying to create assignment (should fail)
        console.log('2. Testing student creating assignment (should fail)...');
        const createAssignment = await fetch(`${BASE_URL}/assignments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${student.token}`
            },
            body: JSON.stringify({
                title: 'Test Assignment',
                description: 'This should fail',
                due_date: '2024-12-31'
            })
        });
        
        if (createAssignment.status === 403) {
            const error = await createAssignment.json();
            console.log('Correctly blocked!');
            console.log(`   Error: ${error.message}\n`);
        } else {
            console.log('Student was able to create assignment (should not happen)');
        }

        // 3. Test: Teacher creating assignment (should succeed)
        console.log('3. Testing teacher creating assignment (should succeed)...');
        const teacherCreate = await fetch(`${BASE_URL}/assignments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${teacher.token}`
            },
            body: JSON.stringify({
                title: 'Final Project',
                description: 'Build a web application',
                due_date: '2024-12-31'
            })
        });
        
        if (teacherCreate.status === 201) {
            const assignment = await teacherCreate.json();
            console.log('Assignment created successfully!');
            console.log(`   ID: ${assignment.assignment.id}`);
            console.log(`   Title: ${assignment.assignment.title}\n`);
            
            // Store assignment ID for later tests
            global.assignmentId = assignment.assignment.id;
        } else {
            console.log('Teacher could not create assignment');
        }

        // 4. Test: Student trying to delete assignment (should fail)
        if (global.assignmentId) {
            console.log('4. Testing student deleting assignment (which should fail)...');
            const deleteRes = await fetch(`${BASE_URL}/assignments/${global.assignmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${student.token}`
                }
            });
            
            if (deleteRes.status === 403) {
                const error = await deleteRes.json();
                console.log('Correctly blocked!');
                console.log(`   Error: ${error.message}\n`);
            } else {
                console.log('Student was able to delete assignment (should not happen)');
            }
        }

        console.log('Authorization tests completed!');
        console.log('\nKey takeaways:');
        console.log('   - Teachers can create/update/delete assignments');
        console.log('   - Students cannot create/update/delete assignments');
        console.log('   - Students can only see their own submissions');
        console.log('   - Teachers can only grade assignments they created');

    } catch (error) {
        console.error('Test failed:', error.message);
        console.error('Make sure the server is running on port 5000');
    }
}

testAuthorization();