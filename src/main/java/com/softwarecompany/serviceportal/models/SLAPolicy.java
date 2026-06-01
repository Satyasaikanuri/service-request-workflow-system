package com.softwarecompany.serviceportal.models;

import jakarta.persistence.*;

@Entity
@Table(name = "sla_policies")
public class SLAPolicy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true)
    private ServiceRequest.Priority priority;

    @Column(nullable = false)
    private Integer slaHours;

    public SLAPolicy() {
    }

    public SLAPolicy(ServiceRequest.Priority priority, Integer slaHours) {
        this.priority = priority;
        this.slaHours = slaHours;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ServiceRequest.Priority getPriority() {
        return priority;
    }

    public void setPriority(ServiceRequest.Priority priority) {
        this.priority = priority;
    }

    public Integer getSlaHours() {
        return slaHours;
    }

    public void setSlaHours(Integer slaHours) {
        this.slaHours = slaHours;
    }
}
