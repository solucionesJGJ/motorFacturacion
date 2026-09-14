import type {
    Dte52DispatchInput,
    NormalizedDte52Dispatch,
} from '../../types/dte52.types.js'

import { formatRut } from '../../utils/rut.util.js'

function optionalText(value: string | undefined) {
    return value?.trim() || null
}

export function normalizeDte52Dispatch(
    dispatch: Dte52DispatchInput,
): NormalizedDte52Dispatch {
    return {
        transferIndicator: Number(dispatch.transferIndicator),

        dispatchType:
            dispatch.dispatchType !== undefined
                ? Number(dispatch.dispatchType)
                : null,

        vehiclePlate: optionalText(dispatch.vehiclePlate),

        carrierRut: dispatch.carrierRut ? formatRut(dispatch.carrierRut) : null,

        driverRut: dispatch.driverRut ? formatRut(dispatch.driverRut) : null,

        driverName: optionalText(dispatch.driverName),

        destinationAddress: dispatch.destinationAddress.trim(),

        destinationCommune: dispatch.destinationCommune.trim(),

        destinationCity: optionalText(dispatch.destinationCity),

        departureDate: dispatch.departureDate,

        departureTime: dispatch.departureTime,

        arrivalDate: dispatch.arrivalDate,
    }
}
