package com.bankfeedback.repository;

import com.bankfeedback.entity.Response;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResponseRepository extends JpaRepository<Response, Long> {
    List<Response> findByFeedbackId(Long feedbackId);
}