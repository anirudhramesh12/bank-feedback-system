package com.bankfeedback.controller;

import com.bankfeedback.entity.User;
import com.bankfeedback.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(UserService userService, AuthenticationManager authenticationManager,
                          SecurityContextRepository securityContextRepository) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<UserView> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.registerCustomer(request.name().trim(), request.email().trim().toLowerCase(), request.password());
        return ResponseEntity.status(HttpStatus.CREATED).body(UserView.from(user));
    }

    @PostMapping("/login")
    public UserView login(@Valid @RequestBody LoginRequest request,
                          HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        request.email().trim().toLowerCase(), request.password()));
        servletRequest.getSession(true);
        servletRequest.changeSessionId();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, servletRequest, servletResponse);
        return UserView.from(userService.findByEmail(authentication.getName()).orElseThrow());
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of("token", csrfToken.getToken());
    }

    @GetMapping("/me")
    public UserView currentUser(Authentication authentication) {
        return UserView.from(userService.findByEmail(authentication.getName()).orElseThrow());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response,
                                       Authentication authentication) {
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        return ResponseEntity.noContent().build();
    }

    public record RegisterRequest(@NotBlank @Size(max = 120) String name,
                                  @NotBlank @Email @Size(max = 255) String email,
                                  @NotBlank @Size(min = 8, max = 72) String password) {}

    public record LoginRequest(@NotBlank @Email @Size(max = 255) String email,
                               @NotBlank String password) {}

    public record UserView(Long id, String name, String email, User.Role role) {
        static UserView from(User user) {
            return new UserView(user.getId(), user.getName(), user.getEmail(), user.getRole());
        }
    }
}