package com.softwarecompany.serviceportal.repositories;

import com.softwarecompany.serviceportal.models.Laptop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LaptopRepository extends JpaRepository<Laptop, Long> {
    List<Laptop> findByStatus(Laptop.LaptopStatus status);

    Optional<Laptop> findByAssignedUserId(Long userId);
}
