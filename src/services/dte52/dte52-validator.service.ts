import { isValidRut } from '../../utils/rut.util.js'

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function isTransferIndicator(value: unknown) {
    return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 9
    )
}

function isDispatchType(value: unknown) {
    return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 3
    )
}

function isIsoDate(value: unknown) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false
    }

    const date = new Date(`${value}T00:00:00Z`)

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    )
}

function isTime(value: unknown) {
    return (
        typeof value === 'string' &&
        /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
    )
}

export function validateDte52Dispatch(dispatch: unknown) {
    const errors: string[] = []

    if (!isRecord(dispatch)) {
        return ['dispatch es obligatorio para DTE 52']
    }

    if (!isTransferIndicator(dispatch.transferIndicator)) {
        errors.push('dispatch.transferIndicator debe ser un entero entre 1 y 9')
    }

    if (
        dispatch.dispatchType !== undefined &&
        !isDispatchType(dispatch.dispatchType)
    ) {
        errors.push('dispatch.dispatchType debe ser 1, 2 o 3')
    }

    if (!isNonEmptyString(dispatch.destinationAddress)) {
        errors.push('dispatch.destinationAddress es obligatorio para DTE 52')
    }

    if (!isNonEmptyString(dispatch.destinationCommune)) {
        errors.push('dispatch.destinationCommune es obligatorio para DTE 52')
    }

    if (!isIsoDate(dispatch.departureDate)) {
        errors.push('dispatch.departureDate debe tener formato YYYY-MM-DD')
    }

    if (!isTime(dispatch.departureTime)) {
        errors.push(
            'dispatch.departureTime debe tener formato HH:mm o HH:mm:ss',
        )
    }

    if (!isIsoDate(dispatch.arrivalDate)) {
        errors.push('dispatch.arrivalDate debe tener formato YYYY-MM-DD')
    }

    if (
        isIsoDate(dispatch.departureDate) &&
        isIsoDate(dispatch.arrivalDate) &&
        String(dispatch.arrivalDate) < String(dispatch.departureDate)
    ) {
        errors.push(
            'dispatch.arrivalDate no puede ser anterior a departureDate',
        )
    }

    if (
        dispatch.carrierRut !== undefined &&
        (!isNonEmptyString(dispatch.carrierRut) ||
            !isValidRut(dispatch.carrierRut))
    ) {
        errors.push('dispatch.carrierRut no es válido')
    }

    if (
        dispatch.driverRut !== undefined &&
        (!isNonEmptyString(dispatch.driverRut) ||
            !isValidRut(dispatch.driverRut))
    ) {
        errors.push('dispatch.driverRut no es válido')
    }

    if (
        dispatch.driverName !== undefined &&
        !isNonEmptyString(dispatch.driverName)
    ) {
        errors.push('dispatch.driverName no puede estar vacío')
    }

    if (
        dispatch.vehiclePlate !== undefined &&
        !isNonEmptyString(dispatch.vehiclePlate)
    ) {
        errors.push('dispatch.vehiclePlate no puede estar vacía')
    }

    if (
        dispatch.destinationCity !== undefined &&
        !isNonEmptyString(dispatch.destinationCity)
    ) {
        errors.push('dispatch.destinationCity no puede estar vacía')
    }

    return errors
}
