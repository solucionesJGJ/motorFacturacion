export type NormalizedBillingItem = {
    lineNumber: number
    description: string
    quantity: number
    unitPrice: number
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
    netAmount: number
    taxAmount: number
    totalAmount: number
    items: NormalizedBillingItem[]
}