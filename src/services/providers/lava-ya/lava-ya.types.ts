export type LavaYaPayment = {
    id: string
    order_id: string
    amount: number
    method: string
    status: string
    paid_at: string
}

export type LavaYaOrderItem = {
    id: string
    name: string
    quantity: number
    unit_price: number
    total: number
}

export type LavaYaOrder = {
    id: string
    customer: {
        rut: string
        name: string
        giro?: string
        address?: string
        comuna?: string
        ciudad?: string
        email?: string
    }
    items: LavaYaOrderItem[]
}