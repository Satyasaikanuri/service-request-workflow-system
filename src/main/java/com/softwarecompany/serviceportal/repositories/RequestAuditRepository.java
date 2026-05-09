package com.softwarecompany.serviceportal.repositories;

import com.softwarecompany.serviceportal.models.RequestAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequestAuditRepository extends JpaRepository<RequestAudit, Long> {
    List<RequestAudit> findByRequestIdOrderByTimestampDesc(Long requestId);

    List<RequestAudit> findTop20ByRequestIdInOrderByTimestampDesc(List<Long> requestIds);

    boolean existsByRequestIdAndAction(Long requestId, String action);

    List<RequestAudit> findByPerformedBy_Id(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByRequestId(Long requestId);
}
