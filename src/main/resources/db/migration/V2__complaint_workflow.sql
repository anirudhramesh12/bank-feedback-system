ALTER TABLE users
    MODIFY role ENUM('CUSTOMER', 'ADMIN', 'STAFF') NOT NULL;

ALTER TABLE feedback
    ADD COLUMN complaint_number VARCHAR(32) NULL;

ALTER TABLE feedback
    ADD COLUMN assigned_staff_id BIGINT NULL;

UPDATE feedback
SET complaint_number = CONCAT('BF-', LPAD(id, 8, '0'))
WHERE complaint_number IS NULL;

UPDATE feedback
SET status = 'PENDING'
WHERE status IS NULL;

ALTER TABLE feedback
    MODIFY complaint_number VARCHAR(32) NOT NULL;

ALTER TABLE feedback
    MODIFY status ENUM('PENDING', 'RESPONDED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE feedback
    ADD CONSTRAINT uq_feedback_complaint_number UNIQUE (complaint_number);

ALTER TABLE feedback
    ADD CONSTRAINT fk_feedback_assigned_staff FOREIGN KEY (assigned_staff_id) REFERENCES users(id);

CREATE TABLE feedback_status_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    feedback_id BIGINT NOT NULL,
    changed_by_id BIGINT NOT NULL,
    previous_status ENUM('PENDING', 'RESPONDED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'),
    new_status ENUM('PENDING', 'RESPONDED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL,
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_feedback_status_history_feedback (feedback_id),
    CONSTRAINT fk_status_history_feedback FOREIGN KEY (feedback_id) REFERENCES feedback(id),
    CONSTRAINT fk_status_history_user FOREIGN KEY (changed_by_id) REFERENCES users(id)
) ENGINE=InnoDB;