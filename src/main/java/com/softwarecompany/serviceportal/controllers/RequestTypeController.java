package com.softwarecompany.serviceportal.controllers;

import com.softwarecompany.serviceportal.models.RequestType;
import com.softwarecompany.serviceportal.repositories.RequestTypeRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/request-types")
public class RequestTypeController {

    @Autowired
    private RequestTypeRepository requestTypeRepository;

    @GetMapping("/all")
    public List<RequestType> getAllRequestTypes() {

        return requestTypeRepository.findAll();
    }
}
