import { isValidRut } from '../utils/rut.util.js'

import { validateDte52Dispatch } from './dte52/dte52-validator.service.js'

const SUPPORTED_DOCUMENT_TYPES = new Set<number>([33, 52])

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isNonNegativeNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function isValidDiscount(value: unknown) {
    return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
    )
}

export function validateBillingInput(input: unknown) {
    const errors: string[] = []

    if (!isRecord(input)) {
        return {
            valid: false,
            errors: ['El documento debe ser un objeto'],
        }
    }

    const receiver = input.receiver

    const items = input.items

    const documentType = input.documentType

    const folio = input.folio

    const externalId = input.externalId

    const dispatch = input.dispatch

    if (externalId !== undefined && !isNonEmptyString(externalId)) {
        errors.push('externalId debe ser un string no vacío')
    }

    if (
        typeof documentType !== 'number' ||
        !Number.isInteger(documentType) ||
        !SUPPORTED_DOCUMENT_TYPES.has(documentType)
    ) {
        errors.push('documentType debe ser un DTE soportado: 33 o 52')
    }

    if (
        folio !== undefined &&
        (typeof folio !== 'number' || !Number.isInteger(folio) || folio <= 0)
    ) {
        errors.push('folio debe ser un entero mayor a 0')
    }

    if (!isRecord(receiver)) {
        errors.push('receiver es obligatorio')
    } else if (!isNonEmptyString(receiver.rut)) {
        errors.push('receiver.rut es obligatorio')
    } else if (!isValidRut(receiver.rut)) {
        errors.push('receiver.rut no es valido')
    }

    if (!isRecord(receiver) || !isNonEmptyString(receiver.razonSocial)) {
        errors.push('receiver.razonSocial es obligatorio')
    }

    /**
     * Las reglas específicas del DTE 52
     * viven fuera del validador general.
     */
    if (documentType === 52) {
        errors.push(...validateDte52Dispatch(dispatch))
    }

    /**
     * DTE 33 conserva su contrato actual:
     * no acepta bloque dispatch.
     */
    if (documentType === 33 && dispatch !== undefined) {
        errors.push('dispatch sólo puede informarse para DTE 52')
    }

    if (!Array.isArray(items) || items.length === 0) {
        errors.push('Debe incluir al menos un item')
    }

    if (Array.isArray(items)) {
        items.forEach((item, index) => {
            if (!isRecord(item)) {
                errors.push(`Item ${index + 1}: debe ser un objeto`)
                return
            }

            if (!isNonEmptyString(item.description)) {
                errors.push(`Item ${index + 1}: description es obligatorio`)
            }

            if (!isPositiveNumber(item.quantity)) {
                errors.push(`Item ${index + 1}: quantity debe ser mayor a 0`)
            }

            if (!isNonNegativeNumber(item.unitPrice)) {
                errors.push(
                    `Item ${index + 1}: unitPrice no puede ser negativo`,
                )
            }

            if (
                item.discountPercentage !== undefined &&
                !isValidDiscount(item.discountPercentage)
            ) {
                errors.push(
                    `Item ${index + 1}: discountPercentage debe estar entre 0 y 100`,
                )
            }
        })
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}
