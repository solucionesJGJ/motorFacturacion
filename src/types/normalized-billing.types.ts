import type { NormalizedDte52Dispatch } from './dte52.types.js'

export type NormalizedBillingItem = {
    lineNumber: number
    description: string
    quantity: number
    unitPrice: number
    lineSubtotal: number
    discountPercentage: number
    discountAmount: number
    netAmount: number
    taxAmount: number
    totalAmount: number
}

export type NormalizedBillingDocument = {
    documentType: number
    folio?: number

    receiverRut: string
    receiverName: string
    receiverGiro?: string | null
    receiverAddress?: string | null
    receiverComuna?: string | null
    receiverCiudad?: string | null

    dispatch?: NormalizedDte52Dispatch | null

    netAmount: number
    taxAmount: number
    totalAmount: number

    items: NormalizedBillingItem[]
}
