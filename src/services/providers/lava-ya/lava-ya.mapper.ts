import type { BillingDocumentInput } from '../../../types/billing.types.js'
import type { LavaYaOrder, LavaYaPayment } from './lava-ya.types.js'

export function mapLavaYaToBillingInput(input: {
    payment: LavaYaPayment
    order: LavaYaOrder
}): BillingDocumentInput {
    const { order } = input

    return {
        documentType: 33,
        receiver: {
            rut: order.customer.rut,
            razonSocial: order.customer.name,
            giro: order.customer.giro || 'SERVICIOS',
            address: order.customer.address,
            comuna: order.customer.comuna,
            ciudad: order.customer.ciudad,
        },
        items: order.items.map((item) => ({
            description: item.name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
        })),
    }
}