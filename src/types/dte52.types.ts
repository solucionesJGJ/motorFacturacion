export type Dte52TransferIndicator = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type Dte52DispatchType = 1 | 2 | 3

export type Dte52DispatchInput = {
    transferIndicator: Dte52TransferIndicator
    dispatchType?: Dte52DispatchType

    vehiclePlate?: string
    carrierRut?: string

    driverRut?: string
    driverName?: string

    destinationAddress: string
    destinationCommune: string
    destinationCity?: string

    departureDate: string
    departureTime: string
    arrivalDate: string
}

export type NormalizedDte52Dispatch = {
    transferIndicator: number
    dispatchType?: number | null

    vehiclePlate?: string | null
    carrierRut?: string | null

    driverRut?: string | null
    driverName?: string | null

    destinationAddress: string
    destinationCommune: string
    destinationCity?: string | null

    departureDate: string
    departureTime: string
    arrivalDate: string
}
