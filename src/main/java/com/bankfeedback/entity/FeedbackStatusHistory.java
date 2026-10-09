package com.bankfeedback.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_status_history")
public class FeedbackStatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "feedback_id", nullable = false)
    private Feedback feedback;

    @ManyToOne(optional = false)
    @JoinColumn(name = "changed_by_id", nullable = false)
    private User changedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status")
    private Feedback.Status previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false)
    private Feedback.Status newStatus;

    private String details;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected FeedbackStatusHistory() {}

    public FeedbackStatusHistory(Feedback feedback, User changedBy, Feedback.Status previousStatus,
                                 Feedback.Status newStatus, String details) {
        this.feedback = feedback;
        this.changedBy = changedBy;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.details = details;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Feedback getFeedback() { return feedback; }
    public User getChangedBy() { return changedBy; }
    public Feedback.Status getPreviousStatus() { return previousStatus; }
    public Feedback.Status getNewStatus() { return newStatus; }
    public String getDetails() { return details; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}