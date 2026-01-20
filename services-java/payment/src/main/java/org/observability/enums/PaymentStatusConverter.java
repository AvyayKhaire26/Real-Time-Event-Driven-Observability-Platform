package org.observability.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.observability.enums.PaymentStatus;

@Converter(autoApply = false)
public class PaymentStatusConverter implements AttributeConverter<PaymentStatus, String> {

    @Override
    public String convertToDatabaseColumn(PaymentStatus attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public PaymentStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return null;
        }
        return PaymentStatus.valueOf(dbData);
    }
}
