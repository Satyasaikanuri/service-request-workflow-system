package com.softwarecompany.serviceportal.repositories;

import com.softwarecompany.serviceportal.models.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkflowRepository extends JpaRepository<Workflow, Long> {
    List<Workflow> findByServiceRequestId(Long serviceRequestId);

    List<Workflow> findByApprover_Id(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByServiceRequestId(Long serviceRequestId);
}
