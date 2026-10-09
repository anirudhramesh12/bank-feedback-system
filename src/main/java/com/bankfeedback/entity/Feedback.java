package com.bankfeedback.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;

@Entity
@Table(name = "feedback")
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "complaint_number", nullable = false, unique = true, updatable = false)
    private String complaintNumber;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "assigned_staff_id")
    private User assignedStaff;

    @Enumerated(EnumType.STRING)
    private Category category;

    private int rating;
    private String comments;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public enum Category {
        ATM, LOAN, ONLINE_BANKING, CUSTOMER_SUPPORT
    }

    public enum Status {
        PENDING, RESPONDED, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED
    }

    // Constructors
    public Feedback() {}

    public Feedback(User user, Category category, int rating, String comments) {
        this.user = user;
        this.complaintNumber = "BF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        this.category = category;
        this.rating = rating;
        this.comments = comments;
        this.status = Status.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getComplaintNumber() { return complaintNumber; }
    public void setComplaintNumber(String complaintNumber) { this.complaintNumber = complaintNumber; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public User getAssignedStaff() { return assignedStaff; }
    public void setAssignedStaff(User assignedStaff) { this.assignedStaff = assignedStaff; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}