package com.softwarecompany.serviceportal.repositories;

import com.softwarecompany.serviceportal.models.Escalation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EscalationRepository extends JpaRepository<Escalation, Long> {
    List<Escalation> findByRequestId(Long requestId);

    List<Escalation> findByEscalatedBy_Id(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByRequestId(Long requestId);
}
