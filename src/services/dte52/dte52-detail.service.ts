import { isDte52NoSaleTransfer } from './dte52-amounts.service.js'

function toInteger(value: unknown) {
    return Math.round(Number(value || 0))
}

export function buildDte52Detail(items: any[], transferIndicator: number) {
    if (!isDte52NoSaleTransfer(transferIndicator)) {
        throw new Error(
            `DTE 52: esta etapa del Motor sólo implementa guías NO VENTA. IndTraslado recibido: ${transferIndicator}`,
        )
    }

    return items.map((item: any) => ({
        NroLinDet: Number(item.line_number),

        NmbItem: item.description,

        QtyItem: Number(item.quantity),

        /**
         * En una guía NO VENTA el SII permite
         * omitir PrcItem.
         *
         * Evitamos enviar un precio unitario
         * comercial que contradiga MontoItem=0.
         */

        MontoItem: toInteger(item.net_amount),
    }))
}
