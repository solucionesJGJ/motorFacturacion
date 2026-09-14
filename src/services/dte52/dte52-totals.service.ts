import { isDte52NoSaleTransfer } from './dte52-amounts.service.js'

export function buildDte52Totals(document: any) {
    const transferIndicator = Number(document.dispatch_transfer_indicator)

    if (!isDte52NoSaleTransfer(transferIndicator)) {
        throw new Error(
            `DTE 52: Totales de guía de venta todavía no implementados. IndTraslado: ${transferIndicator}`,
        )
    }

    const total = Math.round(Number(document.total_amount || 0))

    if (total !== 0) {
        throw new Error(
            `DTE 52 NO VENTA inconsistente: total_amount debe ser 0 y se recibió ${total}`,
        )
    }

    /**
     * MntTotal es obligatorio en DTE 52.
     *
     * Para la guía NO VENTA de TL el total
     * tributario es cero.
     */
    return {
        MntTotal: 0,
    }
}
