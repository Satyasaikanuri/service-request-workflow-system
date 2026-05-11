package com.softwarecompany.serviceportal.services;

import com.softwarecompany.serviceportal.dtos.JwtResponse;
import com.softwarecompany.serviceportal.dtos.LoginRequest;
import com.softwarecompany.serviceportal.dtos.MessageResponse;
import com.softwarecompany.serviceportal.dtos.SignupRequest;
import com.softwarecompany.serviceportal.models.Role;
import com.softwarecompany.serviceportal.models.User;
import com.softwarecompany.serviceportal.repositories.RoleRepository;
import com.softwarecompany.serviceportal.repositories.UserRepository;
import com.softwarecompany.serviceportal.security.JwtUtils;
import com.softwarecompany.serviceportal.security.UserDetailsImpl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthService {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    // LOGIN
    public ResponseEntity<?> authenticateUser(LoginRequest loginRequest) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails =
                (UserDetailsImpl) authentication.getPrincipal();

        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        return ResponseEntity.ok(
                new JwtResponse(
                        jwt,
                        userDetails.getId(),
                        userDetails.getUsername(),
                        userDetails.getEmail(),
                        roles
                )
        );
    }

    // REGISTER
    public ResponseEntity<?> registerUser(SignupRequest signUpRequest) {

        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse(
                            "Error: Username is already taken!"
                    ));
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse(
                            "Error: Email is already in use!"
                    ));
        }

        // Create new user
        User user = new User();

        user.setUsername(signUpRequest.getUsername());
        user.setEmail(signUpRequest.getEmail());
        user.setPassword(
                encoder.encode(signUpRequest.getPassword())
        );

        Set<Role> roles = new HashSet<>();

        Role userRole = roleRepository
                .findByName(Role.RoleName.ROLE_USER)
                .orElseThrow(() ->
                        new RuntimeException("Error: Role not found.")
                );

        roles.add(userRole);

        user.setRoles(roles);

        userRepository.save(user);

        return ResponseEntity.ok(
                new MessageResponse("User registered successfully!")
        );
    }
}
