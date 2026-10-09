CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('CUSTOMER', 'ADMIN') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE feedback (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    category ENUM('ATM', 'LOAN', 'ONLINE_BANKING', 'CUSTOMER_SUPPORT') NOT NULL,
    rating INT NOT NULL,
    comments TEXT,
    status ENUM('PENDING', 'RESPONDED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE responses (
    id BIGINT NOT NULL AUTO_INCREMENT,
    feedback_id BIGINT NOT NULL,
    admin_id BIGINT NOT NULL,
    response_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_response_feedback FOREIGN KEY (feedback_id) REFERENCES feedback(id),
    CONSTRAINT fk_response_admin FOREIGN KEY (admin_id) REFERENCES users(id)
) ENGINE=InnoDB;