
package com.softwarecompany.serviceportal.controllers;

import com.softwarecompany.serviceportal.dtos.ServiceRequestCreateDTO;
import com.softwarecompany.serviceportal.models.ServiceRequest;
import com.softwarecompany.serviceportal.services.RequestService;
import com.softwarecompany.serviceportal.security.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/requests")
public class ServiceRequestController {

    @Autowired
    RequestService requestService;

    @PostMapping
    public ResponseEntity<?> createRequest(@Valid @RequestBody ServiceRequestCreateDTO createDTO) {
        return requestService.createRequest(createDTO);
    }

    @GetMapping("/my")
    public List<ServiceRequest> getMyRequests() {
        return requestService.getMyRequests();
    }

    @GetMapping("/check-hardware")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> checkHardware() {
        UserDetailsImpl userDetails = (UserDetailsImpl) org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        boolean hasHardware = requestService.hasAssignedHardware(userDetails.getId());
        return ResponseEntity.ok(Map.of("hasHardware", hasHardware));
    }

    @GetMapping("/approver")
    @PreAuthorize("hasRole('APPROVER') or hasRole('ADMIN')")
    public List<ServiceRequest> getApproverRequests() {
        return requestService.getRequestsForApprover();
    }

    // For Admin to see ALL
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ServiceRequest> getAllRequests() {
        return requestService.getAllRequestsForAdmin();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('APPROVER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        String remarks = payload.get("remarks");
        return requestService.updateStatus(id, status, remarks);
    }

    @GetMapping("/assigned")
    @PreAuthorize("hasRole('APPROVER')")
    public List<ServiceRequest> getAssignedRequests() {
        return requestService.getRequestsAssignedToMe();
    }

    @GetMapping("/{id}/audit")
    @PreAuthorize("hasRole('APPROVER') or hasRole('ADMIN')")
    public List<com.softwarecompany.serviceportal.models.RequestAudit> getRequestAudits(@PathVariable Long id) {
        return requestService.getRequestAudits(id);
    }

    @GetMapping("/{id}/timeline")
    @PreAuthorize("hasRole('USER')")
    public List<com.softwarecompany.serviceportal.models.RequestAudit> getUserTimeline(@PathVariable Long id) {
        return requestService.getUserRequestTimeline(id);
    }

    @GetMapping("/notifications")
    @PreAuthorize("hasRole('USER')")
    public List<com.softwarecompany.serviceportal.models.RequestAudit> getUserNotifications() {
        return requestService.getUserNotifications();
    }

    @PostMapping("/{id}/seen")
    @PreAuthorize("hasRole('APPROVER') or hasRole('ADMIN')")
    public ResponseEntity<?> markAsSeen(@PathVariable Long id) {
        requestService.markRequestAsSeen(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteRequest(@PathVariable Long id) {
        try {
            requestService.deleteRequest(id);
            return ResponseEntity
                    .ok(new com.softwarecompany.serviceportal.dtos.MessageResponse("Request deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new com.softwarecompany.serviceportal.dtos.MessageResponse(e.getMessage()));
        }
    }
}
