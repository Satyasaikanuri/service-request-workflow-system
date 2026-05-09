package com.softwarecompany.serviceportal.services;

import com.softwarecompany.serviceportal.models.Department;
import com.softwarecompany.serviceportal.models.RequestType;
import com.softwarecompany.serviceportal.models.Role;
import com.softwarecompany.serviceportal.repositories.DepartmentRepository;
import com.softwarecompany.serviceportal.repositories.RequestTypeRepository;
import com.softwarecompany.serviceportal.repositories.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    DepartmentRepository departmentRepository;

    @Autowired
    RequestTypeRepository requestTypeRepository;

    @Autowired
    com.softwarecompany.serviceportal.repositories.LaptopRepository laptopRepository;

    @Override
    public void run(String... args) throws Exception {
        seedRoles();
        seedDepartments();
        seedRequestTypes();
        seedSLAPolicies();
        seedLaptops();
    }

    private void seedRoles() {
        for (Role.RoleName roleName : Role.RoleName.values()) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                roleRepository.save(new Role(null, roleName));
            }
        }
    }

    private void seedDepartments() {
        if (departmentRepository.count() == 0) {
            List<String> depts = Arrays.asList(
                    "IT Support", "Software Development", "QA / Testing",
                    "DevOps / Cloud", "HR", "Finance",
                    "Hardware Support", "Network / Security", "Admin / Management");
            depts.forEach(
                    name -> departmentRepository.save(new Department(null, name, "Department for " + name, true)));
        }
    }

    private void seedRequestTypes() {
        if (requestTypeRepository.count() == 0) {
            List<String> types = Arrays.asList(
                    "Software Installation", "Hardware Repair", "Access Request",
                    "Password Reset", "New Device", "Cloud Resource", "Leave Request", "Expense Claim");
            types.forEach(name -> requestTypeRepository.save(new RequestType(null, name)));
        }
    }

    @Autowired
    com.softwarecompany.serviceportal.repositories.SLAPolicyRepository slaPolicyRepository;

    private void seedSLAPolicies() {
        if (slaPolicyRepository.count() == 0) {
            slaPolicyRepository.save(new com.softwarecompany.serviceportal.models.SLAPolicy(
                    com.softwarecompany.serviceportal.models.ServiceRequest.Priority.LOW, 72));
            slaPolicyRepository.save(new com.softwarecompany.serviceportal.models.SLAPolicy(
                    com.softwarecompany.serviceportal.models.ServiceRequest.Priority.MEDIUM, 48));
            slaPolicyRepository.save(new com.softwarecompany.serviceportal.models.SLAPolicy(
                    com.softwarecompany.serviceportal.models.ServiceRequest.Priority.HIGH, 24));
            slaPolicyRepository.save(new com.softwarecompany.serviceportal.models.SLAPolicy(
                    com.softwarecompany.serviceportal.models.ServiceRequest.Priority.CRITICAL, 4));
        }
    }

    private void seedLaptops() {
        if (laptopRepository.count() == 0) {
            laptopRepository.save(
                    new com.softwarecompany.serviceportal.models.Laptop("Apple", "MacBook Pro 14", "SN-MBP14-001"));
            laptopRepository.save(
                    new com.softwarecompany.serviceportal.models.Laptop("Apple", "MacBook Pro 16", "SN-MBP16-002"));
            laptopRepository
                    .save(new com.softwarecompany.serviceportal.models.Laptop("Dell", "XPS 15", "SN-DELLXPS-003"));
            laptopRepository.save(
                    new com.softwarecompany.serviceportal.models.Laptop("Lenovo", "ThinkPad X1 Carbon", "SN-TPX1-004"));
            laptopRepository
                    .save(new com.softwarecompany.serviceportal.models.Laptop("Apple", "MacBook Air M2", "SN-MBA-005"));
        }
    }
}
