package com.softwarecompany.serviceportal.repositories;

import com.softwarecompany.serviceportal.models.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {
        List<ServiceRequest> findByUserId(Long userId); // For User to view own requests

        List<ServiceRequest> findByDepartmentId(Long departmentId); // For Approver/Admin to view dept requests

        List<ServiceRequest> findByAssignedAgentId(Long agentId);
}
