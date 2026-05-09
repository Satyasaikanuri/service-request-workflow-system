package com.softwarecompany.serviceportal.services;

import com.softwarecompany.serviceportal.models.Role;
import com.softwarecompany.serviceportal.models.ServiceRequest;
import com.softwarecompany.serviceportal.models.User;
import com.softwarecompany.serviceportal.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;

@Service
public class AutoAssignmentService {

    @Autowired
    private UserRepository userRepository;

    public User assignAgent(ServiceRequest request) {
        // Logic: Find agents in the same department
        // TODO: Enhance to check workload/active tickets. For now: Round Robin / Random

        // Assuming we can find users by Role "AGENT" and Department
        // We might need to query all users and filter, or add method to Repo

        // For now, let's try to get all users and filter manually if Repo support is
        // missing
        // or just use department users if role logic is complex in memory

        List<User> departmentUsers = userRepository.findByDepartmentId(request.getDepartment().getId());

        List<User> agents = departmentUsers.stream()
                .filter(u -> u.getRole().getName() == Role.RoleName.APPROVER
                        || u.getRole().getName() == Role.RoleName.ADMIN) // Using APPROVER as Agent for now
                .toList();

        if (agents.isEmpty()) {
            return null;
        }

        // Pick random agent for basic load balancing
        Random rand = new Random();
        return agents.get(rand.nextInt(agents.size()));
    }
}
