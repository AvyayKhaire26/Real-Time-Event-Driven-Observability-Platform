package org.observability.service;

import org.observability.dto.ProductDto;
import org.observability.dto.UpdateProductDto;
import org.observability.entity.Product;
import org.observability.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProductService {

    private static final Logger logger = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository productRepository;

    @Autowired
    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<Product> getAllProducts(String traceId) {
        try {
            logger.info("Fetching all products - TraceId: {}", traceId);
            return productRepository.findAllByOrderByCreatedAtDesc();
        } catch (Exception e) {
            logger.error("Error fetching products - TraceId: {}, Error: {}", traceId, e.getMessage(), e);
            throw e;
        }
    }

    public Optional<Product> getProductById(UUID id, String traceId) {
        try {
            logger.info("Fetching product by id - TraceId: {}, ProductId: {}", traceId, id);
            return productRepository.findById(id);
        } catch (Exception e) {
            logger.error("Error fetching product - TraceId: {}, ProductId: {}, Error: {}", traceId, id, e.getMessage(), e);
            throw e;
        }
    }

    @Transactional
    public Product createProduct(ProductDto productDto, String traceId) {
        try {
            logger.info("Creating new product - TraceId: {}, Name: {}", traceId, productDto.getName());

            Product product = new Product();
            product.setName(productDto.getName());
            product.setDescription(productDto.getDescription());
            product.setPrice(productDto.getPrice());
            product.setStock(productDto.getStock() != null ? productDto.getStock() : 0);
            product.setCategory(productDto.getCategory());
            product.setIsActive(productDto.getIsActive() != null ? productDto.getIsActive() : true);

            Product savedProduct = productRepository.save(product);

            logger.info("Product created successfully - TraceId: {}, ProductId: {}", traceId, savedProduct.getId());

            return savedProduct;
        } catch (Exception e) {
            logger.error("Error creating product - TraceId: {}, Name: {}, Error: {}",
                    traceId, productDto.getName(), e.getMessage(), e);
            throw e;
        }
    }

    @Transactional
    public Product updateProduct(UUID id, UpdateProductDto updateDto, String traceId) {
        try {
            logger.info("Updating product - TraceId: {}, ProductId: {}", traceId, id);

            Product product = productRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Product not found: " + id));

            if (updateDto.getName() != null) {
                product.setName(updateDto.getName());
            }
            if (updateDto.getDescription() != null) {
                product.setDescription(updateDto.getDescription());
            }
            if (updateDto.getPrice() != null) {
                product.setPrice(updateDto.getPrice());
            }
            if (updateDto.getStock() != null) {
                product.setStock(updateDto.getStock());
            }
            if (updateDto.getCategory() != null) {
                product.setCategory(updateDto.getCategory());
            }
            if (updateDto.getIsActive() != null) {
                product.setIsActive(updateDto.getIsActive());
            }

            Product updatedProduct = productRepository.save(product);

            logger.info("Product updated successfully - TraceId: {}, ProductId: {}", traceId, id);

            return updatedProduct;
        } catch (Exception e) {
            logger.error("Error updating product - TraceId: {}, ProductId: {}, Error: {}",
                    traceId, id, e.getMessage(), e);
            throw e;
        }
    }

    @Transactional
    public boolean deleteProduct(UUID id, String traceId) {
        try {
            logger.info("Deleting product - TraceId: {}, ProductId: {}", traceId, id);

            if (!productRepository.existsById(id)) {
                throw new RuntimeException("Product not found: " + id);
            }

            productRepository.deleteById(id);

            logger.info("Product deleted successfully - TraceId: {}, ProductId: {}", traceId, id);

            return true;
        } catch (Exception e) {
            logger.error("Error deleting product - TraceId: {}, ProductId: {}, Error: {}",
                    traceId, id, e.getMessage(), e);
            throw e;
        }
    }

    public boolean checkInventory(UUID productId, int quantity, String traceId) {
        try {
            logger.info("Checking inventory - TraceId: {}, ProductId: {}, Quantity: {}",
                    traceId, productId, quantity);

            boolean hasStock = productRepository.checkStock(productId, quantity);

            logger.info("Inventory check result - TraceId: {}, ProductId: {}, HasStock: {}",
                    traceId, productId, hasStock);

            return hasStock;
        } catch (Exception e) {
            logger.error("Error checking inventory - TraceId: {}, ProductId: {}, Quantity: {}, Error: {}",
                    traceId, productId, quantity, e.getMessage(), e);
            throw e;
        }
    }
}
