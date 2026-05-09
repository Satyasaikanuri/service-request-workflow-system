package com.softwarecompany.serviceportal.repositories;

import com.softwarecompany.serviceportal.models.RequestType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RequestTypeRepository extends JpaRepository<RequestType, Long> {
    Optional<RequestType> findByName(String name);
}
