package com.bankfeedback.service;

import com.bankfeedback.entity.Feedback;
import com.bankfeedback.entity.FeedbackStatusHistory;
import com.bankfeedback.entity.Response;
import com.bankfeedback.entity.User;
import com.bankfeedback.repository.FeedbackRepository;
import com.bankfeedback.repository.FeedbackStatusHistoryRepository;
import com.bankfeedback.repository.ResponseRepository;
import com.bankfeedback.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;

@Service
public class FeedbackService {

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private ResponseRepository responseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FeedbackStatusHistoryRepository statusHistoryRepository;

    public Feedback submitFeedback(Long userId, Feedback.Category category, int rating, String comments) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            Feedback feedback = new Feedback(user.get(), category, rating, comments);
            return feedbackRepository.save(feedback);
        }
        throw new RuntimeException("User not found");
    }

    public List<Feedback> getAllFeedback() {
        return feedbackRepository.findAll();
    }

    public List<Feedback> getFeedbackForUser(Long userId) {
        return feedbackRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public boolean belongsToUser(Long feedbackId, String email) {
        return feedbackRepository.existsByIdAndUserEmail(feedbackId, email);
    }

    public List<Feedback> filterFeedback(Feedback.Category category, Integer rating) {
        if (category != null && rating != null) {
            return feedbackRepository.findByCategoryAndRating(category, rating);
        } else if (category != null) {
            return feedbackRepository.findByCategory(category);
        } else if (rating != null) {
            return feedbackRepository.findByRating(rating);
        }
        return getAllFeedback();
    }

    @Transactional
    public Response respondToFeedback(Long feedbackId, Long adminId, String responseText) {
        Optional<Feedback> feedback = feedbackRepository.findById(feedbackId);
        Optional<User> admin = userRepository.findById(adminId);
        if (feedback.isPresent() && admin.isPresent()
            && (admin.get().getRole() == User.Role.ADMIN || admin.get().getRole() == User.Role.STAFF)) {
            Feedback target = feedback.get();
            User actor = admin.get();
            if (target.getStatus() == Feedback.Status.RESOLVED || target.getStatus() == Feedback.Status.CLOSED) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Resolved complaints cannot receive another response");
            }
            if (actor.getRole() == User.Role.STAFF
                    && (target.getAssignedStaff() == null || !target.getAssignedStaff().getId().equals(actor.getId()))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Complaint is not assigned to this staff member");
            }
            Response response = new Response(target, actor, responseText);
            Feedback.Status previousStatus = target.getStatus();
            target.setStatus(Feedback.Status.RESPONDED);
            feedbackRepository.save(target);
            Response savedResponse = responseRepository.save(response);
            recordStatusChange(target, actor, previousStatus, Feedback.Status.RESPONDED,
                    "Staff response added");
            return savedResponse;
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback or staff account not found");
    }

    @Transactional
    public Feedback assignFeedback(Long feedbackId, Long staffId, User actor) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found"));
        if (feedback.getStatus() == Feedback.Status.RESOLVED || feedback.getStatus() == Feedback.Status.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Resolved complaints cannot be reassigned");
        }
        User staff = userRepository.findById(staffId)
                .filter(user -> user.getRole() == User.Role.STAFF)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a valid staff account"));
        Feedback.Status previousStatus = feedback.getStatus();
        feedback.setAssignedStaff(staff);
        feedback.setStatus(Feedback.Status.ASSIGNED);
        Feedback saved = feedbackRepository.save(feedback);
        recordStatusChange(saved, actor, previousStatus, Feedback.Status.ASSIGNED,
                "Assigned to " + staff.getName());
        return saved;
    }

    @Transactional
    public Feedback updateStatus(Long feedbackId, Feedback.Status newStatus, User actor) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found"));
        if (actor.getRole() == User.Role.STAFF
                && (feedback.getAssignedStaff() == null || !feedback.getAssignedStaff().getId().equals(actor.getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Complaint is not assigned to this staff member");
        }

        Feedback.Status previousStatus = feedback.getStatus();
        boolean validTransition = switch (previousStatus) {
            case ASSIGNED -> newStatus == Feedback.Status.IN_PROGRESS;
            case IN_PROGRESS -> newStatus == Feedback.Status.RESOLVED;
            case RESPONDED, RESOLVED -> newStatus == Feedback.Status.CLOSED;
            default -> false;
        };
        if (!validTransition) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Status cannot change from " + previousStatus + " to " + newStatus);
        }

        feedback.setStatus(newStatus);
        Feedback saved = feedbackRepository.save(feedback);
        recordStatusChange(saved, actor, previousStatus, newStatus, null);
        return saved;
    }

    public List<FeedbackStatusHistory> getStatusHistory(Long feedbackId) {
        return statusHistoryRepository.findByFeedbackIdOrderByCreatedAtAsc(feedbackId);
    }

    private void recordStatusChange(Feedback feedback, User actor, Feedback.Status previousStatus,
                                    Feedback.Status newStatus, String details) {
        statusHistoryRepository.save(new FeedbackStatusHistory(feedback, actor, previousStatus, newStatus, details));
    }

    public List<Response> getResponsesForFeedback(Long feedbackId) {
        return responseRepository.findByFeedbackId(feedbackId);
    }

    public void deleteFeedback(Long feedbackId) {
        Optional<Feedback> feedback = feedbackRepository.findById(feedbackId);
        if (feedback.isPresent()) {
            statusHistoryRepository.deleteByFeedbackId(feedbackId);
            // Delete all responses for this feedback
            List<Response> responses = responseRepository.findByFeedbackId(feedbackId);
            responseRepository.deleteAll(responses);
            // Delete the feedback
            feedbackRepository.deleteById(feedbackId);
        } else {
            throw new RuntimeException("Feedback not found");
        }
    }
}