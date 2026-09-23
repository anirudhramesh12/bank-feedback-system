package com.bankfeedback.controller;

import com.bankfeedback.entity.Feedback;
import com.bankfeedback.entity.Response;
import com.bankfeedback.service.FeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/feedback")
@CrossOrigin(origins = "*")
public class FeedbackController {

    @Autowired
    private FeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<Feedback> submitFeedback(@RequestBody Map<String, Object> payload) {
        Long userId = Long.valueOf(payload.get("userId").toString());
        Feedback.Category category = Feedback.Category.valueOf(payload.get("category").toString());
        int rating = Integer.valueOf(payload.get("rating").toString());
        String comments = payload.get("comments").toString();
        Feedback feedback = feedbackService.submitFeedback(userId, category, rating, comments);
        return ResponseEntity.ok(feedback);
    }

    @GetMapping
    public ResponseEntity<List<Feedback>> getAllFeedback() {
        List<Feedback> feedbackList = feedbackService.getAllFeedback();
        return ResponseEntity.ok(feedbackList);
    }

    @GetMapping("/filter")
    public ResponseEntity<List<Feedback>> filterFeedback(
            @RequestParam(required = false) Feedback.Category category,
            @RequestParam(required = false) Integer rating) {
        List<Feedback> feedbackList = feedbackService.filterFeedback(category, rating);
        return ResponseEntity.ok(feedbackList);
    }

    @PostMapping("/response")
    public ResponseEntity<Response> respondToFeedback(@RequestBody Map<String, Object> payload) {
        Long feedbackId = Long.valueOf(payload.get("feedbackId").toString());
        Long adminId = Long.valueOf(payload.get("adminId").toString());
        String responseText = payload.get("responseText").toString();
        Response response = feedbackService.respondToFeedback(feedbackId, adminId, responseText);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/responses")
    public ResponseEntity<List<Response>> getResponses(@PathVariable Long id) {
        List<Response> responses = feedbackService.getResponsesForFeedback(id);
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFeedback(@PathVariable Long id) {
        feedbackService.deleteFeedback(id);
        return ResponseEntity.noContent().build();
    }
}