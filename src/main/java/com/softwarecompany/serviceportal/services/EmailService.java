package com.softwarecompany.serviceportal.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.base-url}")
    private String baseUrl;

    public void sendVerificationEmail(String email, String username, String token) {
        String verifyUrl = baseUrl + "/api/auth/verify?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Verify your Service Portal Account");
        message.setText("Hello " + username + ",\n\n"
                + "Thank you for registering.\n\n"
                + "Click below to verify your account.\n\n"
                + verifyUrl + "\n\n"
                + "If you did not register, ignore this email.");

        try {
            mailSender.send(message);
        } catch (MailAuthenticationException e) {
            throw new RuntimeException("Email Authentication failed. Please verify SMTP settings.", e);
        } catch (MailSendException e) {
            throw new RuntimeException("Failed to send verification email.", e);
        } catch (Exception e) {
            throw new RuntimeException("An unexpected error occurred while sending email.", e);
        }
    }

    public void sendPasswordResetEmail(String email, String username, String token) {
        String resetUrl = baseUrl + "/api/auth/reset-password?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Reset your Service Portal Password");
        message.setText("Hello " + username + ",\n\n"
                + "We received a request to reset your password.\n\n"
                + "Click below to reset your password:\n\n"
                + resetUrl + "\n\n"
                + "If you did not request this, please ignore this email.");

        try {
            mailSender.send(message);
        } catch (MailAuthenticationException e) {
            throw new RuntimeException("Email Authentication failed. Please verify SMTP settings.", e);
        } catch (MailSendException e) {
            throw new RuntimeException("Failed to send password reset email.", e);
        } catch (Exception e) {
            throw new RuntimeException("An unexpected error occurred while sending email.", e);
        }
    }
}
