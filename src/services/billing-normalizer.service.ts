import type { BillingDocumentInput } from '../types/billing.types.js'
import type {
    NormalizedBillingDocument,
    NormalizedBillingItem,
} from '../types/normalized-billing.types.js'
import { formatRut } from '../utils/rut.util.js'

const IVA_RATE = 0.19

export function normalizeBillingInput(
    input: BillingDocumentInput,
): NormalizedBillingDocument {
    const items: NormalizedBillingItem[] = input.items.map((item, index) => {
        const quantity = Number(item.quantity)
        const unitPrice = Number(item.unitPrice)

        const netAmount = Math.round(quantity * unitPrice)
        const taxAmount = Math.round(netAmount * IVA_RATE)
        const totalAmount = netAmount + taxAmount

        return {
            lineNumber: index + 1,
            description: item.description.trim(),
            quantity,
            unitPrice,
            netAmount,
            taxAmount,
            totalAmount,
        }
    })

    const netAmount = items.reduce((total, item) => total + item.netAmount, 0)
    const taxAmount = items.reduce((total, item) => total + item.taxAmount, 0)
    const totalAmount = items.reduce((total, item) => total + item.totalAmount, 0)

    return {
        documentType: Number(input.documentType),
        folio: input.folio ? Number(input.folio) : undefined,
        receiverRut: formatRut(input.receiver.rut),
        receiverName: input.receiver.razonSocial.trim(),
        receiverGiro: input.receiver.giro?.trim() || null,
        receiverAddress: input.receiver.address?.trim() || null,
        receiverComuna: input.receiver.comuna?.trim() || null,
        receiverCiudad: input.receiver.ciudad?.trim() || null,
        netAmount,
        taxAmount,
        totalAmount,
        items,
    }
}