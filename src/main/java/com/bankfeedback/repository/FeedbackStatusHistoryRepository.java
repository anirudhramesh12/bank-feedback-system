package com.bankfeedback.repository;

import com.bankfeedback.entity.FeedbackStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeedbackStatusHistoryRepository extends JpaRepository<FeedbackStatusHistory, Long> {
    List<FeedbackStatusHistory> findByFeedbackIdOrderByCreatedAtAsc(Long feedbackId);
    void deleteByFeedbackId(Long feedbackId);
}