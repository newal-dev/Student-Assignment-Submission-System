// Test script for the database models

require('dotenv').config();
const { User, Assignment, Submission } = require('./src/models');

async function testDatabase() {
    try {
        console.log('Testing database connection...');
        
        // Test User creation
        console.log('\nTesting User model...');
        const newUser = await User.create({
            username: 'teststudent',
            email: 'test@student.com',
            password: 'password123',
            role: 'student'
        });
        console.log('User created:', newUser);

        // Test finding user
        const foundUser = await User.findByEmail('test@student.com');
        console.log('User found:', foundUser.username);

        // Test Assignment creation (need a teacher)
        const teacher = await User.findByEmail('teacher@school.com');
        if (teacher) {
            const newAssignment = await Assignment.create({
                title: 'Test Assignment',
                description: 'This is a test assignment',
                due_date: '2024-12-31',
                teacher_id: teacher.id
            });
            console.log('Assignment created:', newAssignment.title);
        }

        console.log('\nAll tests passed!');
    } catch (error) {
        console.error('Test failed:', error.message);
    } finally {
        process.exit(0);
    }
}

testDatabase();