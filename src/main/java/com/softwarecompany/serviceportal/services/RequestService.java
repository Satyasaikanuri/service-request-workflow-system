package com.softwarecompany.serviceportal.services;

import com.softwarecompany.serviceportal.dtos.MessageResponse;
import com.softwarecompany.serviceportal.dtos.ServiceRequestCreateDTO;
import com.softwarecompany.serviceportal.models.*;
import com.softwarecompany.serviceportal.repositories.*;
import com.softwarecompany.serviceportal.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RequestService {

    @Autowired
    ServiceRequestRepository requestRepository;

    @Autowired
    LaptopRepository laptopRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    DepartmentRepository departmentRepository;

    @Autowired
    RequestTypeRepository requestTypeRepository;

    @Autowired
    WorkflowRepository workflowRepository;

    @Autowired
    SLAService slaService;

    @Autowired
    AutoAssignmentService autoAssignmentService;

    @Autowired
    AuditService auditService;

    @Autowired
    EscalationRepository escalationRepository;

    @Autowired
    RequestAuditRepository requestAuditRepository;

    private UserDetailsImpl getCurrentUser() {
        return (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public ResponseEntity<?> createRequest(ServiceRequestCreateDTO createDTO) {
        UserDetailsImpl userDetails = getCurrentUser();
        User user = userRepository.findById(userDetails.getId()).orElseThrow();

        // Constraint: Check laptop assignment for ROLE_USER
        if (user.getRole().getName() == Role.RoleName.USER) {
            if (laptopRepository.findByAssignedUserId(user.getId()).isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse(
                                "Error: You must have an assigned laptop to create service requests. Please contact your manager."));
            }
        }

        Department dept = departmentRepository.findById(createDTO.getDepartmentId())
                .orElseThrow(() -> new RuntimeException("Error: Department not found"));

        RequestType type = requestTypeRepository.findById(createDTO.getRequestTypeId())
                .orElseThrow(() -> new RuntimeException("Error: Request Type not found"));

        ServiceRequest request = new ServiceRequest();
        request.setTitle(createDTO.getTitle());
        request.setDescription(createDTO.getDescription());
        request.setDepartment(dept);
        request.setRequestType(type);
        request.setUser(user);

        // Enterprise Logic
        // 1. Priority & SLA
        try {
            ServiceRequest.Priority priority = ServiceRequest.Priority.valueOf(createDTO.getPriority().toUpperCase());
            request.setPriority(priority);
        } catch (Exception e) {
            request.setPriority(ServiceRequest.Priority.LOW);
        }
        slaService.calculateAndSetSLA(request);

        // 2. Auto-Assignment
        User agent = autoAssignmentService.assignAgent(request);
        if (agent != null) {
            request.setAssignedAgent(agent);
            request.setStatus(ServiceRequest.RequestStatus.AUTO_ASSIGNED);
        } else {
            request.setStatus(ServiceRequest.RequestStatus.NEW);
        }

        requestRepository.save(request);

        // 3. Audit
        auditService.logAction(request.getId(), "CREATED", null, request.getStatus().name(), user,
                "Request created by user");
        if (agent != null) {
            auditService.logAction(request.getId(), "ASSIGNMENT", null, null, null,
                    "Auto-assigned to agent: " + agent.getUsername());
        }

        return ResponseEntity.ok(new MessageResponse("Request created successfully!"));
    }

    public List<ServiceRequest> getMyRequests() {
        UserDetailsImpl userDetails = getCurrentUser();
        return requestRepository.findByUserId(userDetails.getId());
    }

    public List<ServiceRequest> getRequestsForApprover() {
        UserDetailsImpl userDetails = getCurrentUser();
        // Approver sees only requests for their department
        if (userDetails.getDepartmentId() == null) {
            // Should not happen for valid approver
            return List.of();
        }
        return requestRepository.findByDepartmentId(userDetails.getDepartmentId());
    }

    public List<ServiceRequest> getAllRequestsForAdmin() {
        return requestRepository.findAll();
    }

    public ResponseEntity<?> updateStatus(Long requestId, String status, String remarks) {
        UserDetailsImpl userDetails = getCurrentUser();
        User approver = userRepository.findById(userDetails.getId()).orElseThrow();

        ServiceRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        // Validation: Is this approver allowed?
        // Admin can approve anything? Or only Approver of that Dept?
        // Spec: "Approver sees ONLY requests of their department". "Approver can
        // Approve/Reject".
        // Let's enforce Dept check for Approver, skip for Admin maybe?
        // Assuming Admin is superuser.
        boolean isAuthorized = false;
        boolean isAdmin = userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            isAuthorized = true;
        } else {
            if (userDetails.getDepartmentId() != null
                    && userDetails.getDepartmentId().equals(request.getDepartment().getId())) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return ResponseEntity.status(403).body(new MessageResponse("Not authorized to approve this request"));
        }

        try {
            ServiceRequest.RequestStatus oldStatus = request.getStatus();
            ServiceRequest.RequestStatus newStatus = ServiceRequest.RequestStatus.valueOf(status.toUpperCase());
            request.setStatus(newStatus);
            requestRepository.save(request);

            // Log workflow (Legacy)
            Workflow workflow = new Workflow();
            workflow.setServiceRequest(request);
            workflow.setApprover(approver);
            workflow.setStatus(newStatus);
            workflow.setRemarks(remarks);
            workflowRepository.save(workflow);

            // Enterprise Audit
            auditService.logAction(request.getId(), "STATUS_CHANGE", oldStatus.name(), newStatus.name(), approver,
                    remarks);

            return ResponseEntity.ok(new MessageResponse("Request updated successfully!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid status"));
        }
    }

    public List<ServiceRequest> getRequestsAssignedToMe() {
        UserDetailsImpl userDetails = getCurrentUser();
        return requestRepository.findByAssignedAgentId(userDetails.getId());
    }

    public List<RequestAudit> getRequestAudits(Long requestId) {
        // Optional: specific security check if needed
        return auditService.getAllAudits().stream()
                .filter(a -> a.getRequestId().equals(requestId))
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .collect(java.util.stream.Collectors.toList());
    }

    public List<RequestAudit> getUserRequestTimeline(Long requestId) {
        UserDetailsImpl userDetails = getCurrentUser();
        ServiceRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (!request.getUser().getId().equals(userDetails.getId())) {
            throw new RuntimeException("Unauthorized access to request timeline");
        }

        return auditService.getAllAudits().stream()
                .filter(a -> a.getRequestId().equals(requestId))
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .collect(java.util.stream.Collectors.toList());
    }

    public List<RequestAudit> getUserNotifications() {
        UserDetailsImpl userDetails = getCurrentUser();
        List<ServiceRequest> myRequests = requestRepository.findByUserId(userDetails.getId());
        if (myRequests.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        List<Long> ids = myRequests.stream().map(ServiceRequest::getId).collect(java.util.stream.Collectors.toList());

        return auditService.getRecentAuditsForRequests(ids);
    }

    public void markRequestAsSeen(Long requestId) {
        UserDetailsImpl userDetails = getCurrentUser();
        ServiceRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        // Check if user is authorized (Approver of dept or Admin)
        boolean isAdmin = userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isApprover = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_APPROVER"));

        if (!isAdmin && !isApprover) {
            throw new RuntimeException("Unauthorized: Only Approvers or Admins can mark as seen");
        }

        if (isApprover && !isAdmin) {
            // Strict Dept check for approver
            if (userDetails.getDepartmentId() != null
                    && !userDetails.getDepartmentId().equals(request.getDepartment().getId())) {
                throw new RuntimeException("Unauthorized: Approver can only see requests from their department");
            }
        }

        // Avoid duplicate "SEEN" logs if recently seen?
        // For now, let's just log it. It serves as a "read receipt".
        // Maybe we only log if the last action wasn't SEEN by this user?
        // Let's keep it simple: Log it. Frontend calls this once per modal open.

        if (requestAuditRepository.existsByRequestIdAndAction(requestId, "SEEN")) {
            return;
        }

        auditService.logAction(requestId, "SEEN", null, request.getStatus().name(),
                userRepository.findById(userDetails.getId()).orElse(null),
                "Request viewed by approver");
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteRequest(Long requestId) {
        UserDetailsImpl userDetails = getCurrentUser();
        ServiceRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        // Authorization: Only Owner or Admin
        boolean isAdmin = userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!request.getUser().getId().equals(userDetails.getId()) && !isAdmin) {
            throw new RuntimeException("Unauthorized: You can only delete your own requests");
        }

        // Manual Cascade Delete
        // 1. Escalations
        escalationRepository.deleteByRequestId(request.getId());

        // 2. Workflows
        workflowRepository.deleteByServiceRequestId(request.getId());

        // 3. Audits
        requestAuditRepository.deleteByRequestId(request.getId());

        // 4. Request
        requestRepository.delete(request);
    }

    public boolean hasAssignedHardware(Long userId) {
        return laptopRepository.findByAssignedUserId(userId).isPresent();
    }
}
