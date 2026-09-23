-- Create database
CREATE DATABASE IF NOT EXISTS bank_feedback_db;
USE bank_feedback_db;

-- Users table
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('CUSTOMER', 'ADMIN') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback table
CREATE TABLE feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    category ENUM('ATM', 'LOAN', 'ONLINE_BANKING', 'CUSTOMER_SUPPORT') NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    status ENUM('PENDING', 'RESPONDED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Responses table
CREATE TABLE responses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    feedback_id BIGINT NOT NULL,
    admin_id BIGINT NOT NULL,
    response_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feedback_id) REFERENCES feedback(id),
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- Insert sample data
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@bank.com', '$2a$10$examplehashedpassword', 'ADMIN'),
('John Doe', 'john@example.com', '$2a$10$examplehashedpassword', 'CUSTOMER');

INSERT INTO feedback (user_id, category, rating, comments) VALUES
(2, 'ATM', 4, 'Good service'),
(2, 'ONLINE_BANKING', 2, 'Slow website');