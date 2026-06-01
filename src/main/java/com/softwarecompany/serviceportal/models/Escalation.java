package com.softwarecompany.serviceportal.models;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "escalations")
public class Escalation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "request_id", nullable = false)
    private ServiceRequest request;

    @CreationTimestamp
    private LocalDateTime escalatedAt;

    @Column(nullable = false)
    private String reason;

    @ManyToOne
    @JoinColumn(name = "escalated_by_id")
    private User escalatedBy; // Null if System

    public Escalation() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ServiceRequest getRequest() {
        return request;
    }

    public void setRequest(ServiceRequest request) {
        this.request = request;
    }

    public LocalDateTime getEscalatedAt() {
        return escalatedAt;
    }

    public void setEscalatedAt(LocalDateTime escalatedAt) {
        this.escalatedAt = escalatedAt;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public User getEscalatedBy() {
        return escalatedBy;
    }

    public void setEscalatedBy(User escalatedBy) {
        this.escalatedBy = escalatedBy;
    }
}
