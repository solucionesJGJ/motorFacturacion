import type { Dte52DispatchInput } from './dte52.types.js'

export type SupportedBillingDocumentType = number

export type BillingItem = {
    description: string
    quantity: number
    unitPrice: number
    discountPercentage?: number
}

export type BillingDocumentInput = {
    externalId?: string
    documentType: SupportedBillingDocumentType
    folio?: number

    receiver: {
        rut: string
        razonSocial: string
        giro?: string
        address?: string
        comuna?: string
        ciudad?: string
    }

    /**
     * Sólo se informa para DTE 52.
     * Las reglas específicas viven en el módulo dte52.
     */
    dispatch?: Dte52DispatchInput

    items: BillingItem[]
}
