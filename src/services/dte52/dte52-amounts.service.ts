import type { NormalizedBillingItem } from '../../types/normalized-billing.types.js'

export function isDte52NoSaleTransfer(transferIndicator: number) {
    return [2, 3, 4, 5, 6, 7, 8].includes(Number(transferIndicator))
}

export function normalizeDte52NoSaleAmounts(
    items: Array<Omit<NormalizedBillingItem, 'taxAmount' | 'totalAmount'>>,
) {
    const normalizedItems: NormalizedBillingItem[] = items.map((item) => ({
        ...item,

        /**
         * Guía NO VENTA:
         * el valor tributario de la línea
         * queda en cero.
         *
         * unitPrice y lineSubtotal se conservan
         * sólo como información interna del Motor.
         */
        netAmount: 0,

        taxAmount: 0,

        totalAmount: 0,
    }))

    return {
        items: normalizedItems,

        netAmount: 0,

        taxAmount: 0,

        totalAmount: 0,
    }
}
