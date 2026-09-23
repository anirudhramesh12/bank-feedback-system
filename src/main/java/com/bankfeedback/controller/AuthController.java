package com.bankfeedback.controller;

import com.bankfeedback.entity.User;
import com.bankfeedback.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody Map<String, Object> payload) {
        String name = payload.get("name").toString();
        String email = payload.get("email").toString();
        String password = payload.get("password").toString();
        User.Role role = User.Role.valueOf(payload.get("role").toString().toUpperCase());
        User user = userService.registerUser(name, email, password, role);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/login")
    public ResponseEntity<User> login(@RequestBody Map<String, Object> payload) {
        String email = payload.get("email").toString();
        String password = payload.get("password").toString();
        if (userService.authenticate(email, password)) {
            Optional<User> user = userService.findByEmail(email);
            return ResponseEntity.ok(user.get());
        }
        return ResponseEntity.badRequest().build();
    }
}