export type BillingItem = {
    description: string
    quantity: number
    unitPrice: number
}

export type BillingDocumentInput = {
    documentType: number
    folio?: number
    receiver: {
        rut: string
        razonSocial: string
        giro?: string
        address?: string
        comuna?: string
        ciudad?: string
    }
    items: BillingItem[]
}