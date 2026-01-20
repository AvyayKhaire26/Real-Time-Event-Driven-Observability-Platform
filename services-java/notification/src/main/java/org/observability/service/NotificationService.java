package org.observability.service;

import org.observability.dto.SendNotificationDto;
import org.observability.entity.Notification;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationService {

    Notification sendNotification(SendNotificationDto notificationDto, String traceId);

    Optional<Notification> getNotificationById(UUID id, String traceId);

    List<Notification> getNotificationsByRecipient(String recipient, String traceId);

    List<Notification> getAllNotifications(String traceId);
}
