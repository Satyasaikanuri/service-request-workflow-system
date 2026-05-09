package com.softwarecompany.serviceportal.controllers;

import com.softwarecompany.serviceportal.models.Department;
import com.softwarecompany.serviceportal.models.RequestType;
import com.softwarecompany.serviceportal.repositories.DepartmentRepository;
import com.softwarecompany.serviceportal.repositories.RequestTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/common")
public class CommonController {

    @Autowired
    DepartmentRepository departmentRepository;

    @Autowired
    RequestTypeRepository requestTypeRepository;

    @GetMapping("/departments")
    public List<Department> getAllDepartments() {
        return departmentRepository.findAll();
    }

    @GetMapping("/request-types")
    public List<RequestType> getAllRequestTypes() {
        return requestTypeRepository.findAll();
    }
}
