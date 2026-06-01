package com.softwarecompany.serviceportal.services;

import com.softwarecompany.serviceportal.models.Role;
import com.softwarecompany.serviceportal.models.Laptop;
import com.softwarecompany.serviceportal.models.ServiceRequest;
import com.softwarecompany.serviceportal.repositories.LaptopRepository;
import com.softwarecompany.serviceportal.repositories.ServiceRequestRepository;
import com.softwarecompany.serviceportal.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminService {

    @Autowired
    UserRepository userRepository;

    @Autowired
    ServiceRequestRepository requestRepository;

    @Autowired
    com.softwarecompany.serviceportal.repositories.RequestAuditRepository auditRepository;

    @Autowired
    com.softwarecompany.serviceportal.repositories.RoleRepository roleRepository;

    @Autowired
    LaptopRepository laptopRepository;

    @Autowired
    com.softwarecompany.serviceportal.repositories.EscalationRepository escalationRepository;

    @Autowired
    com.softwarecompany.serviceportal.repositories.WorkflowRepository workflowRepository;

    @Autowired
    org.springframework.security.crypto.password.PasswordEncoder encoder;

    public Map<String, Object> getSystemStats() {
        Map<String, Object> stats = new HashMap<>();

        // Count all users
        stats.put("totalUsers", userRepository.count());

        // Count just approvers
        long approverCount = userRepository.countByRole_Name(Role.RoleName.APPROVER);
        stats.put("totalApprovers", approverCount);

        // Request Stats
        List<ServiceRequest> allRequests = requestRepository.findAll();
        stats.put("totalRequests", allRequests.size());

        Map<ServiceRequest.RequestStatus, Long> statusCounts = allRequests.stream()
                .collect(Collectors.groupingBy(ServiceRequest::getStatus, Collectors.counting()));
        stats.put("statusBreakdown", statusCounts);

        Map<String, Long> deptCounts = allRequests.stream()
                .collect(Collectors.groupingBy(r -> r.getDepartment().getName(), Collectors.counting()));
        stats.put("departmentBreakdown", deptCounts);

        return stats;
    }

    public List<com.softwarecompany.serviceportal.models.User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<com.softwarecompany.serviceportal.models.RequestAudit> getAllAudits() {
        return auditRepository.findAll(org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.DESC, "timestamp"));
    }

    // --- User Management ---

    public com.softwarecompany.serviceportal.models.User createUser(
            com.softwarecompany.serviceportal.models.User user) {
        // Encode password
        user.setPassword(encoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public com.softwarecompany.serviceportal.models.User updateUser(Long id,
            com.softwarecompany.serviceportal.models.User userDetails) {
        return userRepository.findById(id).map(user -> {
            user.setUsername(userDetails.getUsername());
            user.setEmail(userDetails.getEmail());
            // Don't update password here unless specific logic exists

            if (userDetails.getRole() != null) {
                user.setRole(userDetails.getRole());
            }
            if (userDetails.getDepartment() != null) {
                user.setDepartment(userDetails.getDepartment());
            } else if (userDetails.getRole().getName() == Role.RoleName.USER
                    || userDetails.getRole().getName() == Role.RoleName.ADMIN) {
                // Optionally clear department if not approver, or keep it. Let's keep
                // flexibility.
                user.setDepartment(null);
            }

            return userRepository.save(user);
        }).orElseThrow(() -> new RuntimeException("User not found with id " + id));
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteUser(Long id) {
        // 1. Unlink User from Laptops
        laptopRepository.findByAssignedUserId(id).ifPresent(laptop -> {
            laptop.setAssignedUser(null);
            laptop.setStatus(Laptop.LaptopStatus.AVAILABLE);
            laptopRepository.save(laptop);
        });

        // 2. Clear user reference from audits (Set to NULL in performed_by_id)
        List<com.softwarecompany.serviceportal.models.RequestAudit> audits = auditRepository.findByPerformedBy_Id(id);
        audits.forEach(audit -> {
            audit.setPerformedBy(null);
            auditRepository.save(audit);
        });

        // 3. Clear user reference from escalations
        List<com.softwarecompany.serviceportal.models.Escalation> escalations = escalationRepository
                .findByEscalatedBy_Id(id);
        escalations.forEach(esc -> {
            esc.setEscalatedBy(null);
            escalationRepository.save(esc);
        });

        // 4. Clear user reference from workflows
        List<com.softwarecompany.serviceportal.models.Workflow> workflows = workflowRepository.findByApprover_Id(id);
        workflows.forEach(wf -> {
            wf.setApprover(null);
            workflowRepository.save(wf);
        });

        // 5. Clear user reference from requests where they are the ASSIGNED AGENT
        List<ServiceRequest> assignedRequests = requestRepository.findByAssignedAgentId(id);
        assignedRequests.forEach(req -> {
            req.setAssignedAgent(null);
            requestRepository.save(req);
        });

        // 6. Delete requests OWNED by the user (and their audits, escalations,
        // workflows)
        List<ServiceRequest> ownedRequests = requestRepository.findByUserId(id);
        ownedRequests.forEach(req -> {
            auditRepository.deleteByRequestId(req.getId());
            escalationRepository.deleteByRequestId(req.getId());
            workflowRepository.deleteByServiceRequestId(req.getId());
            requestRepository.delete(req);
        });

        // 7. Finally delete the user
        userRepository.deleteById(id);
    }
}
