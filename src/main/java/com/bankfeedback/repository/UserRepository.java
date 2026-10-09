package com.bankfeedback.repository;

import com.bankfeedback.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    java.util.List<User> findByRoleOrderByNameAsc(User.Role role);
}