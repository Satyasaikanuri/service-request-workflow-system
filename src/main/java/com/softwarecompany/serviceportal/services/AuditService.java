package com.softwarecompany.serviceportal.services;

import com.softwarecompany.serviceportal.models.RequestAudit;
import com.softwarecompany.serviceportal.models.User;
import com.softwarecompany.serviceportal.repositories.RequestAuditRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    @Autowired
    private RequestAuditRepository auditRepository;

    public void logAction(Long requestId, String action, String oldStatus, String newStatus, User performedBy,
            String remarks) {
        RequestAudit audit = new RequestAudit();
        audit.setRequestId(requestId);
        audit.setAction(action);
        audit.setOldStatus(oldStatus);
        audit.setNewStatus(newStatus);
        audit.setPerformedBy(performedBy);
        audit.setRemarks(remarks);
        auditRepository.save(audit);
    }

    public java.util.List<com.softwarecompany.serviceportal.models.RequestAudit> getAllAudits() {
        return auditRepository.findAll();
    }

    public java.util.List<com.softwarecompany.serviceportal.models.RequestAudit> getRecentAuditsForRequests(
            java.util.List<Long> requestIds) {
        return auditRepository.findTop20ByRequestIdInOrderByTimestampDesc(requestIds);
    }
}
