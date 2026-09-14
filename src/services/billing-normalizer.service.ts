import type { BillingDocumentInput } from '../types/billing.types.js'

import type {
    NormalizedBillingDocument,
    NormalizedBillingItem,
} from '../types/normalized-billing.types.js'

import { formatRut } from '../utils/rut.util.js'

import { normalizeDte52Dispatch } from './dte52/dte52-normalizer.service.js'

import {
    isDte52NoSaleTransfer,
    normalizeDte52NoSaleAmounts,
} from './dte52/dte52-amounts.service.js'

const IVA_RATE = 0.19

function roundMoney(value: number) {
    return Math.round(Number(value || 0))
}

export function normalizeBillingInput(
    input: BillingDocumentInput,
): NormalizedBillingDocument {
    const baseItems = input.items.map((item, index) => {
        const quantity = Number(item.quantity)

        const unitPrice = Number(item.unitPrice)

        const discountPercentage = Number(item.discountPercentage || 0)

        const lineSubtotal = roundMoney(quantity * unitPrice)

        const discountAmount = roundMoney(
            lineSubtotal * (discountPercentage / 100),
        )

        const netAmount = roundMoney(lineSubtotal - discountAmount)

        return {
            lineNumber: index + 1,

            description: item.description.trim(),

            quantity,
            unitPrice,
            lineSubtotal,
            discountPercentage,
            discountAmount,
            netAmount,
        }
    })

    const dispatch =
        input.documentType === 52 && input.dispatch
            ? normalizeDte52Dispatch(input.dispatch)
            : null

    /**
     * =====================================================
     * DTE 52 NO VENTA
     * =====================================================
     *
     * Separamos expresamente los montos tributarios
     * de la lógica histórica del DTE 33.
     */
    if (
        input.documentType === 52 &&
        dispatch &&
        isDte52NoSaleTransfer(dispatch.transferIndicator)
    ) {
        const noSale = normalizeDte52NoSaleAmounts(baseItems)

        return {
            documentType: 52,

            folio: input.folio ? Number(input.folio) : undefined,

            receiverRut: formatRut(input.receiver.rut),

            receiverName: input.receiver.razonSocial.trim(),

            receiverGiro: input.receiver.giro?.trim() || null,

            receiverAddress: input.receiver.address?.trim() || null,

            receiverComuna: input.receiver.comuna?.trim() || null,

            receiverCiudad: input.receiver.ciudad?.trim() || null,

            dispatch,

            netAmount: noSale.netAmount,

            taxAmount: noSale.taxAmount,

            totalAmount: noSale.totalAmount,

            items: noSale.items,
        }
    }

    /**
     * =====================================================
     * DTE 33 / CAMINO HISTÓRICO
     * =====================================================
     *
     * Esta sección conserva la misma matemática
     * que ya estaba funcionando.
     */
    const netAmount = baseItems.reduce(
        (total, item) => total + item.netAmount,
        0,
    )

    const taxAmount = roundMoney(netAmount * IVA_RATE)

    const totalAmount = netAmount + taxAmount

    let remainingTax = taxAmount

    const items: NormalizedBillingItem[] = baseItems.map((item, index) => {
        const isLastItem = index === baseItems.length - 1

        const lineTaxAmount = isLastItem
            ? remainingTax
            : roundMoney(item.netAmount * IVA_RATE)

        remainingTax -= lineTaxAmount

        return {
            ...item,

            taxAmount: lineTaxAmount,

            totalAmount: item.netAmount + lineTaxAmount,
        }
    })

    return {
        documentType: Number(input.documentType),

        folio: input.folio ? Number(input.folio) : undefined,

        receiverRut: formatRut(input.receiver.rut),

        receiverName: input.receiver.razonSocial.trim(),

        receiverGiro: input.receiver.giro?.trim() || null,

        receiverAddress: input.receiver.address?.trim() || null,

        receiverComuna: input.receiver.comuna?.trim() || null,

        receiverCiudad: input.receiver.ciudad?.trim() || null,

        dispatch,

        netAmount,
        taxAmount,
        totalAmount,
        items,
    }
}
