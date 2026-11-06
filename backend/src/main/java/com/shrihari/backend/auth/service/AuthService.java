package com.shrihari.backend.auth.service;

import com.shrihari.backend.auth.dto.AuthResponse;
import com.shrihari.backend.auth.dto.LoginRequest;
import com.shrihari.backend.auth.dto.RegisterRequest;
import com.shrihari.backend.auth.model.AppUser;
import com.shrihari.backend.auth.repository.AppUserRepository;
import com.shrihari.backend.auth.security.JwtProvider;
import com.shrihari.backend.common.IdGenerator;
import com.shrihari.backend.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email is already registered: " + email);
        }

        String userId = IdGenerator.generateId("usr");
        String name = (request.getName() != null && !request.getName().trim().isEmpty())
                ? request.getName().trim() : email.split("@")[0];
        String handle = (request.getHandle() != null && !request.getHandle().trim().isEmpty())
                ? request.getHandle().trim() : "@" + name.toLowerCase().replaceAll("\\s+", "");

        AppUser user = AppUser.builder()
                .id(userId)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .name(name)
                .handle(handle)
                .paypalEmail(request.getPaypalEmail())
                .role("USER")
                .build();

        userRepository.save(user);

        String token = jwtProvider.generateToken(user.getId(), user.getEmail(), user.getRole());

        return buildAuthResponse(user, token);
    }

    public AuthResponse login(LoginRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            throw new BadCredentialsException("Email and password are required");
        }

        String email = request.getEmail().trim().toLowerCase();
        AppUser user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtProvider.generateToken(user.getId(), user.getEmail(), user.getRole());

        return buildAuthResponse(user, token);
    }

    public AuthResponse getProfile(String userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        return buildAuthResponse(user, null);
    }

    private AuthResponse buildAuthResponse(AppUser user, String token) {
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType(token != null ? "Bearer" : null)
                .userId(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .handle(user.getHandle())
                .paypalEmail(user.getPaypalEmail())
                .role(user.getRole())
                .build();
    }
}

