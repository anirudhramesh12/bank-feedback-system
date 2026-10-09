package com.bankfeedback.repository;

import com.bankfeedback.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsByIdAndUserEmail(Long id, String email);
    List<Feedback> findByCategory(Feedback.Category category);
    List<Feedback> findByRating(int rating);
    List<Feedback> findByCategoryAndRating(Feedback.Category category, int rating);
}