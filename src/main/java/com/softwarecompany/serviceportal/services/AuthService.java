package com.softwarecompany.serviceportal.services;

import com.softwarecompany.serviceportal.dtos.JwtResponse;
import com.softwarecompany.serviceportal.dtos.LoginRequest;
import com.softwarecompany.serviceportal.dtos.MessageResponse;
import com.softwarecompany.serviceportal.dtos.SignupRequest;
import com.softwarecompany.serviceportal.models.Department;
import com.softwarecompany.serviceportal.models.Role;
import com.softwarecompany.serviceportal.models.User;
import com.softwarecompany.serviceportal.repositories.DepartmentRepository;
import com.softwarecompany.serviceportal.repositories.RoleRepository;
import com.softwarecompany.serviceportal.repositories.UserRepository;
import com.softwarecompany.serviceportal.security.JwtUtils;
import com.softwarecompany.serviceportal.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
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
    DepartmentRepository departmentRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Value("${app.admin.secret-key}")
    private String adminSecretKey;

    public ResponseEntity<?> authenticateUser(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        String departmentName = null;
        if (userDetails.getDepartmentId() != null) {
            departmentName = departmentRepository.findById(userDetails.getDepartmentId())
                    .map(Department::getName).orElse(null);
        }

        return ResponseEntity.ok(new JwtResponse(jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                roles,
                departmentName));
    }

    public ResponseEntity<?> registerUser(SignupRequest signUpRequest) {
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already in use!"));
        }

        // Create new user's account
        User user = new User();
        user.setUsername(signUpRequest.getUsername());
        user.setEmail(signUpRequest.getEmail());
        user.setPassword(encoder.encode(signUpRequest.getPassword()));

        String roleStr = signUpRequest.getRole();
        Role role;

        if (roleStr == null) {
            role = roleRepository.findByName(Role.RoleName.USER)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
        } else {
            switch (roleStr.toLowerCase()) {
                case "admin":
                    if (!adminSecretKey.equals(signUpRequest.getAdminSecret())) {
                        return ResponseEntity.badRequest()
                                .body(new MessageResponse("Error: Invalid Admin Secret Key!"));
                    }
                    role = roleRepository.findByName(Role.RoleName.ADMIN)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    break;
                case "approver":
                    role = roleRepository.findByName(Role.RoleName.APPROVER)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    if (signUpRequest.getDepartmentId() == null) {
                        return ResponseEntity.badRequest()
                                .body(new MessageResponse("Error: Department is required for Approver!"));
                    }
                    Department dept = departmentRepository.findById(signUpRequest.getDepartmentId())
                            .orElseThrow(() -> new RuntimeException("Error: Department not found."));
                    user.setDepartment(dept);
                    break;
                case "manager":
                    role = roleRepository.findByName(Role.RoleName.MANAGER)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    break;
                default:
                    role = roleRepository.findByName(Role.RoleName.USER)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            }
        }

        user.setRole(role);
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }
}
