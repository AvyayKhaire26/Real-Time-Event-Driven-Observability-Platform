package org.observability.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.observability.enums.PaymentMethod;

@Converter(autoApply = false)
public class PaymentMethodConverter implements AttributeConverter<PaymentMethod, String> {

    @Override
    public String convertToDatabaseColumn(PaymentMethod attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public PaymentMethod convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return null;
        }
        return PaymentMethod.valueOf(dbData);
    }
}
