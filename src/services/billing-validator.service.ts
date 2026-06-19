import type { BillingDocumentInput } from '../types/billing.types.js'
import { isValidRut } from '../utils/rut.util.js'

export function validateBillingInput(input: BillingDocumentInput) {
    const errors: string[] = []

    if (!input.documentType) {
        errors.push('documentType es obligatorio')
    }

    if (!input.receiver?.rut) {
        errors.push('receiver.rut es obligatorio')
    } else if (!isValidRut(input.receiver.rut)) {
        errors.push('receiver.rut no es válido')
    }

    if (!input.receiver?.razonSocial?.trim()) {
        errors.push('receiver.razonSocial es obligatorio')
    }

    if (!input.items || input.items.length === 0) {
        errors.push('Debe incluir al menos un item')
    }

    input.items?.forEach((item, index) => {
        if (!item.description?.trim()) {
            errors.push(`Item ${index + 1}: description es obligatorio`)
        }

        if (!item.quantity || item.quantity <= 0) {
            errors.push(`Item ${index + 1}: quantity debe ser mayor a 0`)
        }

        if (item.unitPrice < 0) {
            errors.push(`Item ${index + 1}: unitPrice no puede ser negativo`)
        }
    })

    return {
        valid: errors.length === 0,
        errors,
    }
}