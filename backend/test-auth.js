// Tests registration, login, and protected routes

require('dotenv').config();

// Simulate HTTP requests using fetch
async function testAuth() {
    const BASE_URL = 'http://localhost:5000/api';
    
    try {
        console.log('Testing Authentication System\n');

        // 1. Test Registration
        console.log('1. Testing Registration...');
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            password: 'Test123456',
            role: 'student'
        };

        const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        if (!registerResponse.ok) {
            const error = await registerResponse.json();
            console.error('Registration failed:', error);
            return;
        }

        const registerData = await registerResponse.json();
        console.log('Registration successful!');
        console.log('   User:', registerData.user.username);
        console.log('   Token:', registerData.token.substring(0, 30) + '...\n');

        const token = registerData.token;

        // 2. Test Login
        console.log('2. Testing Login...');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
            })
        });

        if (!loginResponse.ok) {
            const error = await loginResponse.json();
            console.error('Login failed:', error);
            return;
        }

        const loginData = await loginResponse.json();
        console.log('Login successful!');
        console.log('   Welcome:', loginData.user.username);
        console.log('   Role:', loginData.user.role);
        console.log('   New Token:', loginData.token.substring(0, 30) + '...\n');

        // 3. Test Protected Route
        console.log('3. Testing Protected Route...');
        const profileResponse = await fetch(`${BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });

        if (!profileResponse.ok) {
            const error = await profileResponse.json();
            console.error('Profile fetch failed:', error);
            return;
        }

        const profileData = await profileResponse.json();
        console.log('Profile accessed successfully!');
        console.log('   Profile:', profileData.user.username, `(${profileData.user.role})`);
        console.log('   Email:', profileData.user.email);
        console.log('   Created:', profileData.user.created_at, '\n');

        // 4. Test Invalid Token
        console.log('4. Testing Invalid Token...');
        const invalidResponse = await fetch(`${BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': 'Bearer invalid.token.here'
            }
        });

        if (invalidResponse.status === 401) {
            const error = await invalidResponse.json();
            console.log('Invalid token correctly rejected!');
            console.log('   Error:', error.message, '\n');
        } else {
            console.log('Invalid token not rejected properly');
        }

        console.log('All auth tests completed successfully!');
        console.log('\nRemember: Your API is now secured with JWT authentication!');

    } catch (error) {
        console.error('Test failed:', error.message);
        console.error('Make sure the server is running on port 5000');
    }
}

testAuth();