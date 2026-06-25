import {
    BillingDocument,
    BillingDocumentItem,
} from '../../models/index.js'
import { getIssuerConfig } from '../../config/issuer.config.js'

function line(width = 48) {
    return '-'.repeat(width)
}

function center(text: string, width = 48) {
    const value = text.substring(0, width)
    const left = Math.floor((width - value.length) / 2)
    return `${' '.repeat(left)}${value}`
}

function money(value: unknown) {
    return `$${Number(value || 0).toLocaleString('es-CL')}`
}

function formatItemLine(
    description: string,
    quantity: number,
    unitPrice: number,
    total: number,
    width = 48,
) {
    const name = description.substring(0, width)
    const detail = `${quantity} x ${money(unitPrice)}`
    const amount = money(total)

    const spaces = Math.max(width - detail.length - amount.length, 1)

    return `${name}\n${detail}${' '.repeat(spaces)}${amount}`
}

export async function renderThermalTicket(documentId: string) {
    const width = Number(process.env.THERMAL_PRINTER_WIDTH || 48)

    const document = await BillingDocument.findByPk(documentId, {
        include: [{ model: BillingDocumentItem, as: 'items' }],
    })

    if (!document) {
        throw new Error('Documento no encontrado')
    }

    const issuer = getIssuerConfig()
    const docJson = document.toJSON() as any
    const items = docJson.items || []

    const lines: string[] = []

    lines.push(center(issuer.razonSocial, width))
    lines.push(center(`RUT: ${issuer.rut}`, width))
    lines.push(center(issuer.giro, width))
    lines.push(center(`${issuer.comuna}, ${issuer.ciudad}`, width))
    lines.push(line(width))

    lines.push(center(`DTE ${document.document_type}`, width))
    lines.push(center(`FOLIO ${document.folio}`, width))
    lines.push(line(width))

    lines.push(`Cliente: ${document.receiver_name}`.substring(0, width))
    lines.push(`RUT: ${document.receiver_rut}`.substring(0, width))
    lines.push(line(width))

    items.forEach((item: any) => {
        lines.push(
            formatItemLine(
                item.description,
                Number(item.quantity),
                Number(item.unit_price),
                Number(item.net_amount),
                width,
            ),
        )
    })

    lines.push(line(width))
    lines.push(`NETO:${money(document.net_amount).padStart(width - 5)}`)
    lines.push(`IVA:${money(document.tax_amount).padStart(width - 4)}`)
    lines.push(`TOTAL:${money(document.total_amount).padStart(width - 6)}`)
    lines.push(line(width))

    lines.push(center('TIMBRE ELECTRONICO SII', width))
    lines.push(center('Verifique documento en www.sii.cl', width))
    lines.push('\n\n\n')

    return lines.join('\n')
}