package com.softwarecompany.serviceportal.controllers;

import com.softwarecompany.serviceportal.dtos.LoginRequest;
import com.softwarecompany.serviceportal.dtos.SignupRequest;
import com.softwarecompany.serviceportal.services.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    AuthService authService;

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        return authService.authenticateUser(loginRequest);
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        return authService.registerUser(signUpRequest);
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyUser(@RequestParam String token) {
        ResponseEntity<?> response = authService.verifyUser(token);
        if (response.getStatusCode().is2xxSuccessful()) {
            String html = "<html><head><link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'></head>"
                    + "<body style='font-family: \"Outfit\", sans-serif; text-align: center; padding-top: 100px; background: #0f172a; color: #f8fafc;'>"
                    + "<div style='display: inline-block; padding: 40px; border-radius: 12px; background: #1e293b; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); max-width: 500px;'>"
                    + "<i class='fas fa-check-circle' style='color: #10b981; font-size: 4rem; margin-bottom: 20px;'></i>"
                    + "<h2 style='color: #10b981; margin-top: 10px; font-size: 1.75rem; font-weight: 700;'>Email Verified Successfully!</h2>"
                    + "<p style='color: #94a3b8; font-size: 1.1rem; line-height: 1.6; margin: 15px 0 25px 0;'>Your account has been verified. You can now close this window and log in to the Service Portal.</p>"
                    + "<a href='/login.html' style='display: inline-block; padding: 12px 28px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.4); transition: all 0.2s;'>Go to Login</a>"
                    + "</div></body></html>";
            return ResponseEntity.ok().contentType(org.springframework.http.MediaType.TEXT_HTML).body(html);
        } else {
            String errorMsg = "Invalid verification token!";
            if (response.getBody() instanceof MessageResponse) {
                errorMsg = ((MessageResponse) response.getBody()).getMessage();
            }
            String html = "<html><head><link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'></head>"
                    + "<body style='font-family: \"Outfit\", sans-serif; text-align: center; padding-top: 100px; background: #0f172a; color: #f8fafc;'>"
                    + "<div style='display: inline-block; padding: 40px; border-radius: 12px; background: #1e293b; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); max-width: 500px;'>"
                    + "<i class='fas fa-times-circle' style='color: #ef4444; font-size: 4rem; margin-bottom: 20px;'></i>"
                    + "<h2 style='color: #ef4444; margin-top: 10px; font-size: 1.75rem; font-weight: 700;'>Verification Failed</h2>"
                    + "<p style='color: #94a3b8; font-size: 1.1rem; line-height: 1.6; margin: 15px 0 25px 0;'>" + errorMsg + "</p>"
                    + "<a href='/login.html' style='display: inline-block; padding: 12px 28px; background: #475569; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; transition: all 0.2s;'>Back to Login</a>"
                    + "</div></body></html>";
            return ResponseEntity.status(400).contentType(org.springframework.http.MediaType.TEXT_HTML).body(html);
        }
    }
}
