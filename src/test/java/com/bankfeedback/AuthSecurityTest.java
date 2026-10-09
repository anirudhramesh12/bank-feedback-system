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
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
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
                        .with(SecurityMockMvcRequestPostProcessors.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer@example.com","password":"a-strong-password"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andReturn();

        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        org.junit.jupiter.api.Assertions.assertNotEquals(anonymousSessionId, session.getId());
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("customer@example.com"));
        mockMvc.perform(get("/api/feedback").session(session))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/admin.html").session(session))
                .andExpect(status().isOk());
    }

    @Test
    void feedbackApiRejectsAnonymousRequests() throws Exception {
        mockMvc.perform(get("/api/feedback"))
                .andExpect(status().isUnauthorized());
    }
}