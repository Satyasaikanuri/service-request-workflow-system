package com.softwarecompany.serviceportal.controllers;

import com.softwarecompany.serviceportal.services.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    AdminService adminService;

    @GetMapping("/stats")
    public Map<String, Object> getSystemStats() {
        return adminService.getSystemStats();
    }

    // Users endpoint moved to AdminUserController

    @GetMapping("/audits")
    public java.util.List<com.softwarecompany.serviceportal.models.RequestAudit> getSystemAudits() {
        return adminService.getAllAudits();
    }
}
