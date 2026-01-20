package org.observability.repository;

import org.observability.entity.Print;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrintRepository extends JpaRepository<Print, UUID> {

    Optional<Print> findByOrderId(UUID orderId);

    List<Print> findAllByOrderByCreatedAtDesc();
}
