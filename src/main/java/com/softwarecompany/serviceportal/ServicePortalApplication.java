package com.softwarecompany.serviceportal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ServicePortalApplication {

    public static void main(String[] args) {
        SpringApplication.run(ServicePortalApplication.class, args);
    }

}
