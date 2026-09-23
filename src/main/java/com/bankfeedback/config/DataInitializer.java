package com.bankfeedback.config;

import com.bankfeedback.entity.Feedback;
import com.bankfeedback.entity.User;
import com.bankfeedback.repository.FeedbackRepository;
import com.bankfeedback.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Create admin user
        User admin = new User("Admin User", "admin@bank.com", passwordEncoder.encode("admin123"), User.Role.ADMIN);
        userRepository.save(admin);

        // Create customer users
        User customer1 = new User("John Doe", "john@example.com", passwordEncoder.encode("john123"), User.Role.CUSTOMER);
        User customer2 = new User("Jane Smith", "jane@example.com", passwordEncoder.encode("jane123"), User.Role.CUSTOMER);
        userRepository.save(customer1);
        userRepository.save(customer2);

        // Create sample feedback
        Feedback f1 = new Feedback(customer1, Feedback.Category.ATM, 4, "ATM machine is working well, easy to use");
        Feedback f2 = new Feedback(customer1, Feedback.Category.ONLINE_BANKING, 2, "Website is very slow and sometimes crashes");
        Feedback f3 = new Feedback(customer2, Feedback.Category.CUSTOMER_SUPPORT, 5, "Excellent customer service! Very helpful staff");
        Feedback f4 = new Feedback(customer2, Feedback.Category.LOAN, 3, "Loan approval process is lengthy and confusing");
        Feedback f5 = new Feedback(customer1, Feedback.Category.ONLINE_BANKING, 5, "New mobile app is amazing!");

        feedbackRepository.save(f1);
        feedbackRepository.save(f2);
        feedbackRepository.save(f3);
        feedbackRepository.save(f4);
        feedbackRepository.save(f5);
    }
}