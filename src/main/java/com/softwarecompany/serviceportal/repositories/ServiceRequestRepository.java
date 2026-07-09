package com.softwarecompany.serviceportal.repositories;

import com.softwarecompany.serviceportal.models.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long>, JpaSpecificationExecutor<ServiceRequest> {
        List<ServiceRequest> findByUserId(Long userId);

        List<ServiceRequest> findByDepartmentId(Long departmentId);

        List<ServiceRequest> findByAssignedAgentId(Long agentId);

        List<ServiceRequest> findByUserIdAndDeletedAtIsNull(Long userId);

        List<ServiceRequest> findByDepartmentIdAndDeletedAtIsNull(Long departmentId);

        List<ServiceRequest> findByAssignedAgentIdAndDeletedAtIsNull(Long agentId);

        List<ServiceRequest> findByDeletedAtIsNull();
}
