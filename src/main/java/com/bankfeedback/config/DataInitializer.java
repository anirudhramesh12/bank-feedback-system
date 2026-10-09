package com.bankfeedback.config;

import com.bankfeedback.entity.Feedback;
import com.bankfeedback.entity.User;
import com.bankfeedback.repository.FeedbackRepository;
import com.bankfeedback.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("demo")
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${DEMO_ADMIN_PASSWORD:}")
    private String demoAdminPassword;

    @Value("${DEMO_CUSTOMER_PASSWORD:}")
    private String demoCustomerPassword;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() > 0 || feedbackRepository.count() > 0) {
            return;
        }

        requireDemoPassword("DEMO_ADMIN_PASSWORD", demoAdminPassword);
        requireDemoPassword("DEMO_CUSTOMER_PASSWORD", demoCustomerPassword);

        // Create admin user
        User admin = new User("Admin User", "admin@bank.com", passwordEncoder.encode(demoAdminPassword), User.Role.ADMIN);
        userRepository.save(admin);

        // Create customer users
        User customer1 = new User("John Doe", "john@example.com", passwordEncoder.encode(demoCustomerPassword), User.Role.CUSTOMER);
        User customer2 = new User("Jane Smith", "jane@example.com", passwordEncoder.encode(demoCustomerPassword), User.Role.CUSTOMER);
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

    private void requireDemoPassword(String variableName, String password) {
        if (password == null || password.length() < 12 || password.length() > 72) {
            throw new IllegalStateException(variableName + " must be configured with 12 to 72 characters when the demo profile is active");
        }
    }
}