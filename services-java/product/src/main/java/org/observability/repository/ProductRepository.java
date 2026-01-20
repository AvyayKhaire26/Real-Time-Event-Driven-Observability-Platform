package org.observability.repository;

import org.observability.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

    List<Product> findAllByOrderByCreatedAtDesc();

    @Query("SELECT CASE WHEN p.stock >= :quantity THEN true ELSE false END FROM Product p WHERE p.id = :productId")
    boolean checkStock(@Param("productId") UUID productId, @Param("quantity") int quantity);
}
