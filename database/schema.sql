-- To drop tables in reverse order (cascade)
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- TO store both students and teachers
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster login queries
CREATE INDEX idx_users_email ON users(email);

-- Create index on role for filtering users
CREATE INDEX idx_users_role ON users(role);

-- created by teacher, submitted by students
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on teacher_id for finding assignments by teacher
CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);

-- Create index on due_date for sorting/filtering
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

-- student submissions for the assignments
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,  -- Text content (if no file)
    file_url VARCHAR(500),  -- URL to uploaded file (if any)
    grade DECIMAL(5, 2),  -- 0.00 to 100.00
    feedback TEXT,  -- Teacher's feedback on the submission
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Each student can only submit once per assignment
    CONSTRAINT unique_submission UNIQUE (assignment_id, student_id),
    
    -- Either content or file_url must be provided
    CONSTRAINT content_or_file CHECK (
        content IS NOT NULL OR file_url IS NOT NULL
    )
);

-- Create indexes for faster queries
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);

-- Automatically update updated_at timestamps

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to assignments table
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to submissions table
CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- sample data for testing

-- NB. passwords will be hashed in the application but plain text for the testing
-- sample user
INSERT INTO users (username, email, password_hash, role) VALUES
    ('teacher1', 'teacher@school.com', 'password_hash_here', 'teacher'),
    ('student1', 'student1@school.com', 'password_hash_here', 'student'),
    ('student2', 'student2@school.com', 'password_hash_here', 'student');

-- sample assignment
INSERT INTO assignments (title, description, due_date, teacher_id) VALUES
    ('Web Programming Final Project', 'Build a full-stack web application using Node.js, Express, and PostgreSQL', '2024-07-15', 1),
    ('Database Design Assignment', 'Design an ERD for a library management system', '2024-07-20', 1);

-- sample submission
INSERT INTO submissions (assignment_id, student_id, content, file_url) VALUES
    (1, 2, 'I will build a student assignment submission system!', NULL),
    (1, 3, 'I am building a real-time chat application.', NULL);