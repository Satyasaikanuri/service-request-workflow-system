package com.softwarecompany.serviceportal.repositories;

import com.softwarecompany.serviceportal.models.SLAPolicy;
import com.softwarecompany.serviceportal.models.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SLAPolicyRepository extends JpaRepository<SLAPolicy, Long> {
    Optional<SLAPolicy> findByPriority(ServiceRequest.Priority priority);
}
