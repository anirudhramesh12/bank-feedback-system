package com.bankfeedback.service;

import com.bankfeedback.entity.Feedback;
import com.bankfeedback.entity.Response;
import com.bankfeedback.entity.User;
import com.bankfeedback.repository.FeedbackRepository;
import com.bankfeedback.repository.ResponseRepository;
import com.bankfeedback.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
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

    public Response respondToFeedback(Long feedbackId, Long adminId, String responseText) {
        Optional<Feedback> feedback = feedbackRepository.findById(feedbackId);
        Optional<User> admin = userRepository.findById(adminId);
        if (feedback.isPresent() && admin.isPresent() && admin.get().getRole() == User.Role.ADMIN) {
            Response response = new Response(feedback.get(), admin.get(), responseText);
            feedback.get().setStatus(Feedback.Status.RESPONDED);
            feedbackRepository.save(feedback.get());
            return responseRepository.save(response);
        }
        throw new RuntimeException("Invalid feedback or admin");
    }

    public List<Response> getResponsesForFeedback(Long feedbackId) {
        return responseRepository.findByFeedbackId(feedbackId);
    }

    public void deleteFeedback(Long feedbackId) {
        Optional<Feedback> feedback = feedbackRepository.findById(feedbackId);
        if (feedback.isPresent()) {
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