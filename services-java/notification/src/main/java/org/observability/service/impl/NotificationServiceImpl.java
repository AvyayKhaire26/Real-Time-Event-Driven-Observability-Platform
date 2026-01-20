package org.observability.service.impl;

import org.modelmapper.ModelMapper;
import org.observability.dto.SendNotificationDto;
import org.observability.entity.Notification;
import org.observability.enums.NotificationStatus;
import org.observability.repository.NotificationRepository;
import org.observability.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final NotificationRepository notificationRepository;
    private final ModelMapper modelMapper;

    @Autowired
    public NotificationServiceImpl(NotificationRepository notificationRepository, ModelMapper modelMapper) {
        this.notificationRepository = notificationRepository;
        this.modelMapper = modelMapper;
    }

    @Override
    @Transactional
    public Notification sendNotification(SendNotificationDto notificationDto, String traceId) {
        try {
            logger.info("Creating notification - TraceId: {}", traceId);

            // Map DTO to Entity
            Notification notification = modelMapper.map(notificationDto, Notification.class);
            notification.setStatus(NotificationStatus.PENDING);

            // Save notification
            Notification savedNotification = notificationRepository.save(notification);
            logger.info("Notification created with ID: {} - TraceId: {}", savedNotification.getId(), traceId);

            // Simulate sending
            simulateSending(savedNotification, traceId);

            // Update status to SENT
            savedNotification.setStatus(NotificationStatus.SENT);
            savedNotification.setSentAt(LocalDateTime.now());
            Notification updatedNotification = notificationRepository.save(savedNotification);

            logger.info("Notification sent - ID: {}, Type: {}, Recipient: {} - TraceId: {}",
                    updatedNotification.getId(),
                    updatedNotification.getType(),
                    updatedNotification.getRecipient(),
                    traceId);

            return updatedNotification;
        } catch (Exception e) {
            logger.error("Failed to send notification - TraceId: {}, Error: {}", traceId, e.getMessage(), e);
            throw new RuntimeException("Failed to send notification", e);
        }
    }

    @Override
    public Optional<Notification> getNotificationById(UUID id, String traceId) {
        logger.info("Fetching notification by ID: {} - TraceId: {}", id, traceId);
        return notificationRepository.findById(id);
    }

    @Override
    public List<Notification> getNotificationsByRecipient(String recipient, String traceId) {
        logger.info("Fetching notifications for recipient: {} - TraceId: {}", recipient, traceId);
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(recipient);
    }

    @Override
    public List<Notification> getAllNotifications(String traceId) {
        logger.info("Fetching all notifications - TraceId: {}", traceId);
        return notificationRepository.findAllByOrderByCreatedAtDesc();
    }

    private void simulateSending(Notification notification, String traceId) {
        try {
            Thread.sleep(500); // Simulate delay
            logger.info("📧 [{}] Sending to: {} - TraceId: {}",
                    notification.getType(),
                    notification.getRecipient(),
                    traceId);

            if (notification.getSubject() != null) {
                logger.info("Subject: {} - TraceId: {}", notification.getSubject(), traceId);
            }
            logger.info("Message: {} - TraceId: {}", notification.getMessage(), traceId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.error("Simulation interrupted - TraceId: {}", traceId, e);
        }
    }
}
