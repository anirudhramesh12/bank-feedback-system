package com.bankfeedback.controller;

import com.bankfeedback.entity.Feedback;
import com.bankfeedback.entity.FeedbackStatusHistory;
import com.bankfeedback.entity.Response;
import com.bankfeedback.entity.User;
import com.bankfeedback.service.FeedbackService;
import com.bankfeedback.service.UserService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {
    private final FeedbackService feedbackService;
    private final UserService userService;

    public FeedbackController(FeedbackService feedbackService, UserService userService) {
        this.feedbackService = feedbackService;
        this.userService = userService;
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<FeedbackView> submitFeedback(@Valid @RequestBody FeedbackRequest request,
                                                        Authentication authentication) {
        User customer = userService.findByEmail(authentication.getName()).orElseThrow();
        Feedback feedback = feedbackService.submitFeedback(customer.getId(), request.category(),
                request.rating(), request.comments().trim());
        return ResponseEntity.status(HttpStatus.CREATED).body(FeedbackView.from(feedback));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<FeedbackView> getMyFeedback(Authentication authentication) {
        User customer = userService.findByEmail(authentication.getName()).orElseThrow();
        return feedbackService.getFeedbackForUser(customer.getId()).stream().map(FeedbackView::from).toList();
    }

    @GetMapping("/community")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<CommunityFeedbackView> getCommunityFeedback() {
        return feedbackService.getAllFeedback().stream()
                .map(feedback -> new CommunityFeedbackView(feedback.getId(), feedback.getComplaintNumber(),
                        feedback.getCategory(), feedback.getRating(), feedback.getComments(), feedback.getStatus(),
                        feedback.getCreatedAt()))
                .toList();
    }

    @GetMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public List<StaffView> getStaff() {
        return userService.getStaff().stream().map(user -> new StaffView(user.getId(), user.getName())).toList();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public List<FeedbackView> getAllFeedback() {
        return feedbackService.getAllFeedback().stream().map(FeedbackView::from).toList();
    }

    @GetMapping("/filter")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public List<FeedbackView> filterFeedback(
            @RequestParam(required = false) Feedback.Category category,
            @RequestParam(required = false) Integer rating) {
        return feedbackService.filterFeedback(category, rating).stream().map(FeedbackView::from).toList();
    }

    @PostMapping("/response")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseView respondToFeedback(@Valid @RequestBody ResponseRequest request,
                                          Authentication authentication) {
        User staff = userService.findByEmail(authentication.getName()).orElseThrow();
        return ResponseView.from(feedbackService.respondToFeedback(
                request.feedbackId(), staff.getId(), request.responseText().trim()));
    }

    @PatchMapping("/{id}/assignment")
    @PreAuthorize("hasRole('ADMIN')")
    public FeedbackView assignFeedback(@PathVariable Long id, @Valid @RequestBody AssignmentRequest request,
                                       Authentication authentication) {
        User actor = userService.findByEmail(authentication.getName()).orElseThrow();
        return FeedbackView.from(feedbackService.assignFeedback(id, request.staffId(), actor));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public FeedbackView updateStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request,
                                     Authentication authentication) {
        User actor = userService.findByEmail(authentication.getName()).orElseThrow();
        return FeedbackView.from(feedbackService.updateStatus(id, request.status(), actor));
    }

    @GetMapping("/{id}/history")
    public List<StatusHistoryView> getStatusHistory(@PathVariable Long id, Authentication authentication) {
        boolean canManage = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN")
                        || authority.getAuthority().equals("ROLE_STAFF"));
        if (!canManage && !feedbackService.belongsToUser(id, authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found");
        }
        return feedbackService.getStatusHistory(id).stream().map(StatusHistoryView::from).toList();
    }

    @GetMapping("/{id}/responses")
    public List<ResponseView> getResponses(@PathVariable Long id, Authentication authentication) {
        boolean canManage = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN")
                        || authority.getAuthority().equals("ROLE_STAFF"));
        if (!canManage && !feedbackService.belongsToUser(id, authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found");
        }
        return feedbackService.getResponsesForFeedback(id).stream().map(ResponseView::from).toList();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteFeedback(@PathVariable Long id) {
        feedbackService.deleteFeedback(id);
        return ResponseEntity.noContent().build();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FeedbackRequest(@NotNull Feedback.Category category,
                                  @Min(1) @Max(5) int rating,
                                  @NotBlank @Size(max = 500) String comments) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ResponseRequest(@NotNull Long feedbackId,
                                  @NotBlank @Size(max = 5000) String responseText) {}

    public record AssignmentRequest(@NotNull Long staffId) {}

    public record StatusRequest(@NotNull Feedback.Status status) {}

    public record StaffView(Long id, String name) {}

    public record CommunityFeedbackView(Long id, String complaintNumber, Feedback.Category category, int rating,
                                        String comments, Feedback.Status status, LocalDateTime createdAt) {}

    public record UserSummary(Long id, String name, String email) {
        static UserSummary from(User user) {
            return user == null ? null : new UserSummary(user.getId(), user.getName(), user.getEmail());
        }
    }

    public record FeedbackView(Long id, String complaintNumber, Feedback.Category category, int rating,
                               String comments, Feedback.Status status, LocalDateTime createdAt,
                               UserSummary user, UserSummary assignedStaff) {
        static FeedbackView from(Feedback feedback) {
            return new FeedbackView(feedback.getId(), feedback.getComplaintNumber(), feedback.getCategory(),
                    feedback.getRating(), feedback.getComments(), feedback.getStatus(), feedback.getCreatedAt(),
                    UserSummary.from(feedback.getUser()), UserSummary.from(feedback.getAssignedStaff()));
        }
    }

    public record ResponseView(Long id, Long feedbackId, UserSummary admin, String responseText,
                               LocalDateTime createdAt) {
        static ResponseView from(Response response) {
            return new ResponseView(response.getId(), response.getFeedback().getId(),
                    UserSummary.from(response.getAdmin()), response.getResponseText(), response.getCreatedAt());
        }
    }

    public record StatusHistoryView(Long id, Long feedbackId, Feedback.Status previousStatus,
                                    Feedback.Status newStatus, String details, LocalDateTime createdAt,
                                    String changedBy) {
        static StatusHistoryView from(FeedbackStatusHistory history) {
            return new StatusHistoryView(history.getId(), history.getFeedback().getId(),
                    history.getPreviousStatus(), history.getNewStatus(), history.getDetails(),
                    history.getCreatedAt(), history.getChangedBy().getName());
        }
    }
}