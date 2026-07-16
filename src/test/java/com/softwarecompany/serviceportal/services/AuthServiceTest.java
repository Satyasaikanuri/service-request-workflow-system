package com.softwarecompany.serviceportal.services;

import com.softwarecompany.serviceportal.dtos.MessageResponse;
import com.softwarecompany.serviceportal.dtos.SignupRequest;
import com.softwarecompany.serviceportal.models.Role;
import com.softwarecompany.serviceportal.models.User;
import com.softwarecompany.serviceportal.repositories.RoleRepository;
import com.softwarecompany.serviceportal.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    @InjectMocks
    private AuthService authService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder encoder;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void registerUser_Success() {
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("testuser");
        signupRequest.setEmail("test@example.com");
        signupRequest.setPassword("password");
        signupRequest.setRole("user");

        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(encoder.encode("password")).thenReturn("hashedPassword");

        Role role = new Role();
        role.setName(Role.RoleName.USER);
        when(roleRepository.findByName(Role.RoleName.USER)).thenReturn(Optional.of(role));

        ResponseEntity<?> response = authService.registerUser(signupRequest);

        assertEquals(200, response.getStatusCode().value());
        assertTrue(((MessageResponse) response.getBody()).getMessage().contains("User registered successfully"));
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void registerUser_UsernameExists() {
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("testuser");

        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        ResponseEntity<?> response = authService.registerUser(signupRequest);

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Error: Username is already taken!", ((MessageResponse) response.getBody()).getMessage());
        verify(userRepository, never()).save(any(User.class));
    }
}
