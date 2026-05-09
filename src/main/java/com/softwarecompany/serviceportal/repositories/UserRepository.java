package com.softwarecompany.serviceportal.repositories;

import com.softwarecompany.serviceportal.models.Role;
import com.softwarecompany.serviceportal.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Boolean existsByEmail(String email);

    Boolean existsByUsername(String username);

    // Count users by their role name
    long countByRole_Name(Role.RoleName roleName);

    java.util.List<User> findByDepartmentId(Long departmentId);
}
