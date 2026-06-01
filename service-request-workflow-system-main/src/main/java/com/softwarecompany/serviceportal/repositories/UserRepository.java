package com.softwarecompany.serviceportal.repositories;

import com.softwarecompany.serviceportal.models.Role;
import com.softwarecompany.serviceportal.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    Boolean existsByEmail(String email);

    Boolean existsByUsername(String username);

    long countByRole_Name(Role.RoleName roleName);

    List<User> findByDepartmentId(Long departmentId);
}
