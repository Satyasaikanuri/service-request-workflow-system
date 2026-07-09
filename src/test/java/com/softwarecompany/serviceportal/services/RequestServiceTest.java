package com.softwarecompany.serviceportal.services;

import com.softwarecompany.serviceportal.models.ServiceRequest;
import com.softwarecompany.serviceportal.models.User;
import com.softwarecompany.serviceportal.repositories.LaptopRepository;
import com.softwarecompany.serviceportal.repositories.ServiceRequestRepository;
import com.softwarecompany.serviceportal.repositories.UserRepository;
import com.softwarecompany.serviceportal.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RequestServiceTest {

    @InjectMocks
    private RequestService requestService;

    @Mock
    private ServiceRequestRepository requestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private LaptopRepository laptopRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void hasAssignedHardware_True() {
        when(laptopRepository.findByAssignedUserId(1L)).thenReturn(Optional.of(new com.softwarecompany.serviceportal.models.Laptop()));
        assertTrue(requestService.hasAssignedHardware(1L));
    }

    @Test
    void hasAssignedHardware_False() {
        when(laptopRepository.findByAssignedUserId(1L)).thenReturn(Optional.empty());
        assertFalse(requestService.hasAssignedHardware(1L));
    }

    @Test
    void deleteRequest_Success() {
        UserDetailsImpl userDetails = new UserDetailsImpl(1L, "user", "user@example.com", "pass",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")), 1L);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userDetails);

        User owner = new User();
        owner.setId(1L);

        ServiceRequest request = new ServiceRequest();
        request.setId(10L);
        request.setUser(owner);
        request.setStatus(ServiceRequest.RequestStatus.PENDING);

        when(requestRepository.findById(10L)).thenReturn(Optional.of(request));
        when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

        requestService.deleteRequest(10L);

        assertNotNull(request.getDeletedAt());
        verify(requestRepository, times(1)).save(request);
        verify(auditService, times(1)).logAction(eq(10L), eq("DELETED"), any(), any(), any(), any());
    }

    @Test
    void deleteRequest_Unauthorized() {
        UserDetailsImpl userDetails = new UserDetailsImpl(2L, "otheruser", "other@example.com", "pass",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")), 1L);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userDetails);

        User owner = new User();
        owner.setId(1L);

        ServiceRequest request = new ServiceRequest();
        request.setId(10L);
        request.setUser(owner);
        request.setStatus(ServiceRequest.RequestStatus.PENDING);

        when(requestRepository.findById(10L)).thenReturn(Optional.of(request));

        Exception exception = assertThrows(RuntimeException.class, () -> {
            requestService.deleteRequest(10L);
        });

        assertEquals("Unauthorized: You can only delete your own requests", exception.getMessage());
        assertNull(request.getDeletedAt());
        verify(requestRepository, never()).save(any(ServiceRequest.class));
    }
}
