package com.softwarecompany.serviceportal.services;

import com.softwarecompany.serviceportal.models.*;
import com.softwarecompany.serviceportal.repositories.ServiceRequestRepository;
import com.softwarecompany.serviceportal.repositories.SLAPolicyRepository;
import com.softwarecompany.serviceportal.repositories.EscalationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class SLAService {

    @Autowired
    private ServiceRequestRepository requestRepository;

    @Autowired
    private SLAPolicyRepository slaPolicyRepository;

    @Autowired
    private EscalationRepository escalationRepository;

    @Autowired
    private AuditService auditService;

    public void calculateAndSetSLA(ServiceRequest request) {
        // Find policy for priority
        Optional<SLAPolicy> policyOpt = slaPolicyRepository.findByPriority(request.getPriority());
        Integer hours = policyOpt.map(SLAPolicy::getSlaHours).orElse(72); // Default 72h (LOW)

        request.setSlaHours(hours);
        request.setDueDate(LocalDateTime.now().plusHours(hours));
    }

    @Scheduled(fixedRate = 60000) // Check every minute
    @Transactional
    public void convertBreachedRequestsToEscalated() {
        // Find non-closed requests passed due date and not yet escalated
        // Note: We need a custom query or filter in memory. For demo filter memory is
        // fine if volume low.
        // Ideally: requestRepository.findBreachedRequests(LocalDateTime.now(),
        // "RESOLVED", "CLOSED", "REJECTED");

        List<ServiceRequest> activeRequests = requestRepository.findAll(); // TODO: optimize query

        for (ServiceRequest req : activeRequests) {
            if (isProcessable(req) && !req.isEscalated() && req.getDueDate() != null
                    && req.getDueDate().isBefore(LocalDateTime.now())) {
                escalateRequest(req);
            }
        }
    }

    private boolean isProcessable(ServiceRequest req) {
        ServiceRequest.RequestStatus s = req.getStatus();
        return s != ServiceRequest.RequestStatus.RESOLVED &&
                s != ServiceRequest.RequestStatus.CLOSED &&
                s != ServiceRequest.RequestStatus.REJECTED; // Legacy & New closed statuses
    }

    private void escalateRequest(ServiceRequest request) {
        request.setEscalated(true);
        ServiceRequest.RequestStatus oldStatus = request.getStatus();
        request.setStatus(ServiceRequest.RequestStatus.ESCALATED);

        requestRepository.save(request);

        // Record Escalation
        Escalation escalation = new Escalation();
        escalation.setRequest(request);
        escalation.setReason("SLA Breach: Due date passed " + request.getDueDate());
        escalation.setEscalatedAt(LocalDateTime.now());
        escalationRepository.save(escalation);

        // Audit
        auditService.logAction(request.getId(), "ESCALATION", oldStatus.name(), "ESCALATED", null,
                "System Auto-Escalation due to SLA Breach");
    }
}
