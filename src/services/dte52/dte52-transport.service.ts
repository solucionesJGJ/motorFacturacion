function normalizeRut(value: unknown) {
    const rut = String(value || '')
        .trim()
        .replace(/\./g, '')
        .replace(/\s/g, '')
        .toUpperCase()

    if (!/^\d{1,8}-[\dK]$/.test(rut)) {
        throw new Error(`RUT inválido para Transporte DTE 52: ${value}`)
    }

    return rut
}

function requiredText(value: unknown, fieldName: string) {
    const text = String(value || '').trim()

    if (!text) {
        throw new Error(`DTE 52: falta ${fieldName}`)
    }

    return text
}

export function buildDte52Transport(document: any) {
    const dispatchType =
        document.dispatch_type !== null && document.dispatch_type !== undefined
            ? Number(document.dispatch_type)
            : null

    const destinationAddress = requiredText(
        document.dispatch_destination_address,
        'DirDest',
    )

    const destinationCommune = requiredText(
        document.dispatch_destination_commune,
        'CmnaDest',
    )

    const departureDate = requiredText(
        document.dispatch_departure_date,
        'FchSalida',
    )

    const departureTime = requiredText(
        document.dispatch_departure_time,
        'HraSalida',
    )

    const arrivalDate = requiredText(
        document.dispatch_arrival_date,
        'FchLlegada',
    )

    const driverRut = normalizeRut(
        requiredText(document.dispatch_driver_rut, 'RUTChofer'),
    )

    const driverName = requiredText(
        document.dispatch_driver_name,
        'NombreChofer',
    )

    let carrierRut: string | null = null

    let vehiclePlate: string | null = null

    if (dispatchType === 2 || dispatchType === 3) {
        carrierRut = normalizeRut(
            requiredText(document.dispatch_carrier_rut, 'RUTTrans'),
        )

        vehiclePlate = requiredText(document.dispatch_vehicle_plate, 'Patente')
    }

    return {
        ...(vehiclePlate
            ? {
                  Patente: vehiclePlate,
              }
            : {}),

        ...(carrierRut
            ? {
                  RUTTrans: carrierRut,
              }
            : {}),

        RUTChofer: driverRut,

        NombreChofer: driverName,

        DirDest: destinationAddress,

        CmnaDest: destinationCommune,

        ...(document.dispatch_destination_city
            ? {
                  CiudadDest: String(document.dispatch_destination_city).trim(),
              }
            : {}),

        FchSalida: departureDate,

        HraSalida: departureTime,

        FchLlegada: arrivalDate,
    }
}
