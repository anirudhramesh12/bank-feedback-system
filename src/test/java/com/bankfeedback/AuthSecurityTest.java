package com.bankfeedback;

import com.bankfeedback.entity.User;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthSecurityTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void clearUsers() {
        userRepository.deleteAll();
    }

    @Test
    void registrationCannotChoosePrivilegedRoleOrReadPassword() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .with(Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf()))
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content("""
                                {"name":"Test Customer","email":"customer@example.com","password":"a-strong-password","role":"ADMIN"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void loginPersistsSessionAndCustomersCannotAccessStaffData() throws Exception {
        userRepository.save(new User("Test Customer", "customer@example.com",
                passwordEncoder.encode("a-strong-password"), User.Role.CUSTOMER));
        MockHttpSession anonymousSession = new MockHttpSession();
        String anonymousSessionId = anonymousSession.getId();

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .session(anonymousSession)
                        .with(Objects.requireNonNull(SecurityMockMvcRequestPostProcessors.csrf()))
                        .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content("""
                                {"email":"customer@example.com","password":"a-strong-password"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andReturn();

        HttpSession session = login.getRequest().getSession(false);
        if (!(session instanceof MockHttpSession authenticatedSession)) {
            throw new AssertionError("Login did not create a session");
        }
        org.junit.jupiter.api.Assertions.assertNotEquals(anonymousSessionId, authenticatedSession.getId());
        mockMvc.perform(get("/api/auth/me").session(authenticatedSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("customer@example.com"));
        mockMvc.perform(get("/api/feedback").session(authenticatedSession))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/admin.html").session(authenticatedSession))
                .andExpect(status().isOk());
    }

    @Test
    void feedbackApiRejectsAnonymousRequests() throws Exception {
        mockMvc.perform(get("/api/feedback"))
                .andExpect(status().isUnauthorized());
    }
}