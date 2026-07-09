package com.softwarecompany.serviceportal.controllers;

import com.softwarecompany.serviceportal.models.Laptop;
import com.softwarecompany.serviceportal.models.Role;
import com.softwarecompany.serviceportal.models.User;
import com.softwarecompany.serviceportal.repositories.LaptopRepository;
import com.softwarecompany.serviceportal.repositories.UserRepository;
import com.softwarecompany.serviceportal.dtos.MessageResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
public class ManagerController {

    @Autowired
    UserRepository userRepository;

    @Autowired
    LaptopRepository laptopRepository;

    @GetMapping("/new-users")
    public ResponseEntity<?> getNewUsersWithoutLaptops() {
        // Find all users with ROLE_USER
        List<User> allUsers = userRepository.findAll();
        List<User> usersWithoutLaptops = allUsers.stream()
                .filter(user -> user.getRole().getName() == Role.RoleName.USER)
                .filter(user -> laptopRepository.findByAssignedUserId(user.getId()).isEmpty())
                .collect(Collectors.toList());

        return ResponseEntity.ok(usersWithoutLaptops);
    }

    @GetMapping("/available-laptops")
    public ResponseEntity<?> getAvailableLaptops() {
        return ResponseEntity.ok(laptopRepository.findByStatus(Laptop.LaptopStatus.AVAILABLE));
    }

    @PostMapping("/assign-laptop")
    public ResponseEntity<?> assignLaptop(@RequestBody Map<String, Long> payload) {
        Long userId = payload.get("userId");
        Long laptopId = payload.get("laptopId");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Laptop laptop = laptopRepository.findById(laptopId)
                .orElseThrow(() -> new RuntimeException("Laptop not found"));

        if (laptop.getStatus() == Laptop.LaptopStatus.ASSIGNED) {
            return ResponseEntity.badRequest().body(new MessageResponse("Laptop is already assigned"));
        }

        laptop.setAssignedUser(user);
        laptop.setStatus(Laptop.LaptopStatus.ASSIGNED);
        laptopRepository.save(laptop);

        return ResponseEntity.ok(new MessageResponse("Laptop assigned successfully to " + user.getUsername()));
    }
}
