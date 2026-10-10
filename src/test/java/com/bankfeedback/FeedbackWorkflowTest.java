package com.bankfeedback;

import com.bankfeedback.entity.Feedback;
import com.bankfeedback.entity.User;
import com.bankfeedback.repository.FeedbackRepository;
import com.bankfeedback.repository.FeedbackStatusHistoryRepository;
import com.bankfeedback.repository.ResponseRepository;
import com.bankfeedback.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import jakarta.servlet.http.HttpSession;

import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeedbackWorkflowTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private ResponseRepository responseRepository;

    @Autowired
    private FeedbackStatusHistoryRepository historyRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void clearTestData() {
        historyRepository.deleteAll();
        responseRepository.deleteAll();
        feedbackRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void customerSubmissionUsesSessionIdentityAndCommunityOmitsCustomerIdentity() throws Exception {
        User customer = saveUser("customer@example.com", User.Role.CUSTOMER);
        MockHttpSession customerSession = login(Objects.requireNonNull(customer.getEmail()));

        MvcResult created = mockMvc.perform(post("/api/feedback")
                        .session(customerSession)
                        .with(Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf()))
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content("""
                                {"userId":99999,"category":"ATM","rating":4,"comments":"The ATM was available"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.id").value(customer.getId()))
                .andExpect(jsonPath("$.complaintNumber").isNotEmpty())
                .andReturn();
        assertNotNull(created.getResponse().getContentAsString());

        mockMvc.perform(get("/api/feedback/community").session(customerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].comments").value("The ATM was available"))
                .andExpect(jsonPath("$[0].user").doesNotExist());
        mockMvc.perform(get("/api/feedback/mine").session(customerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].user.email").value(customer.getEmail()));
    }

    @Test
    void adminAssignsAndAssignedStaffResolvesWithAnAuditTrail() throws Exception {
        User admin = saveUser("admin@example.com", User.Role.ADMIN);
        User staff = saveUser("staff@example.com", User.Role.STAFF);
        User customer = saveUser("owner@example.com", User.Role.CUSTOMER);
        Feedback feedback = feedbackRepository.save(new Feedback(customer, Feedback.Category.LOAN, 2,
                "Please review my loan application"));

        MockHttpSession adminSession = login(Objects.requireNonNull(admin.getEmail()));
        mockMvc.perform(patch("/api/feedback/{id}/assignment", feedback.getId())
                        .session(adminSession)
                        .with(Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf()))
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content("{\"staffId\":" + staff.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.assignedStaff.id").value(staff.getId()));

        MockHttpSession staffSession = login(Objects.requireNonNull(staff.getEmail()));
        mockMvc.perform(patch("/api/feedback/{id}/status", feedback.getId())
                        .session(staffSession)
                        .with(Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf()))
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content("{\"status\":\"IN_PROGRESS\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        mockMvc.perform(patch("/api/feedback/{id}/status", feedback.getId())
                        .session(staffSession)
                        .with(Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf()))
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        mockMvc.perform(patch("/api/feedback/{id}/status", feedback.getId())
                        .session(adminSession)
                        .with(Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf()))
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content("{\"status\":\"CLOSED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));

        mockMvc.perform(post("/api/feedback/response")
                        .session(staffSession)
                        .with(Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf()))
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content("{\"feedbackId\":" + feedback.getId() + ",\"responseText\":\"Reopen\"}"))
                .andExpect(status().isConflict());

        assertEquals(4, historyRepository.findByFeedbackIdOrderByCreatedAtAsc(
                Objects.requireNonNull(feedback.getId())).size());
        mockMvc.perform(get("/api/feedback/{id}/history", feedback.getId()).session(staffSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[2].newStatus").value("RESOLVED"))
                .andExpect(jsonPath("$[3].newStatus").value("CLOSED"));
    }

    @Test
    void staffCannotChangeAnUnassignedComplaint() throws Exception {
        User staff = saveUser("staff@example.com", User.Role.STAFF);
        User customer = saveUser("customer@example.com", User.Role.CUSTOMER);
        Feedback feedback = feedbackRepository.save(new Feedback(customer, Feedback.Category.ATM, 1,
                "The machine did not work"));

        mockMvc.perform(patch("/api/feedback/{id}/status", feedback.getId())
                        .session(login(Objects.requireNonNull(staff.getEmail())))
                        .with(Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf()))
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content("{\"status\":\"IN_PROGRESS\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/feedback/response")
                        .session(login(Objects.requireNonNull(staff.getEmail())))
                        .with(Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf()))
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content("{\"feedbackId\":" + feedback.getId() + ",\"responseText\":\"Unauthorized response\"}"))
                .andExpect(status().isForbidden());
    }

    private User saveUser(String email, User.Role role) {
        return userRepository.save(new User(email.substring(0, email.indexOf('@')), email,
                passwordEncoder.encode("a-strong-password"), role));
    }

    private MockHttpSession login(String email) throws Exception {
        String loginPayload = Objects.requireNonNull("""
                {"email":"%s","password":"a-strong-password"}
                """.formatted(email));
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .with(Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf()))
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content(loginPayload))
                .andExpect(status().isOk())
                .andReturn();
                HttpSession session = result.getRequest().getSession(false);
                if (session instanceof MockHttpSession mockSession) {
                        return mockSession;
                }
                throw new AssertionError("Login did not create a mock session");
    }
}