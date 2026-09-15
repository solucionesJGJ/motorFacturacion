import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import PDFDocument from 'pdfkit'

import {
    BillingDocument,
    BillingDocumentItem,
} from '../../models/index.js'
import { getIssuerConfig } from '../../config/issuer.config.js'
import { extractTedFromXmlFile } from './ted-extractor.service.js'
import { generatePdf417Buffer } from './pdf417.service.js'

const PAGE_LEFT = 36
const PAGE_RIGHT = 559
const PAGE_WIDTH = PAGE_RIGHT - PAGE_LEFT
const PAGE_BOTTOM = 790

const DETAIL_TOP = 295
const DETAIL_BOTTOM = 545

type PrintableContext = {
    pdf: PDFKit.PDFDocument
    billingDocument: any
    items: any[]
    issuer: any
    pdf417Buffer: Buffer
    cedible: boolean
}

/**
 * ============================================================
 * UTILIDADES
 * ============================================================
 */

function money(value: unknown) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(Number(value || 0))
}

function formatQuantity(value: unknown) {
    const number = Number(value || 0)

    if (Number.isInteger(number)) {
        return String(number)
    }

    return number.toLocaleString('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })
}

function formatDate(value: unknown) {
    if (!value) {
        return '-'
    }

    const raw = String(value)

    /**
     * DATEONLY llega normalmente como YYYY-MM-DD.
     *
     * Evitamos desfases por zona horaria.
     */
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)

    if (isoMatch) {
        return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`
    }

    const date = new Date(raw)

    if (Number.isNaN(date.getTime())) {
        return '-'
    }

    return date.toLocaleDateString('es-CL')
}

function documentName(documentType: number) {
    switch (Number(documentType)) {
        case 33:
            return 'FACTURA ELECTRÓNICA'

        case 34:
            return 'FACTURA EXENTA ELECTRÓNICA'

        case 39:
            return 'BOLETA ELECTRÓNICA'

        case 41:
            return 'BOLETA EXENTA ELECTRÓNICA'

        case 52:
            return 'GUÍA DE DESPACHO ELECTRÓNICA'

        case 56:
            return 'NOTA DE DÉBITO ELECTRÓNICA'

        case 61:
            return 'NOTA DE CRÉDITO ELECTRÓNICA'

        default:
            return `DTE ${documentType}`
    }
}

function isDispatchGuide(documentType: number) {
    return Number(documentType) === 52
}

function isNoSaleDispatchGuide(billingDocument: any) {
    if (!isDispatchGuide(billingDocument.document_type)) {
        return false
    }

    return [2, 3, 4, 5, 6, 7, 8].includes(
        Number(billingDocument.dispatch_transfer_indicator),
    )
}

function transferIndicatorName(value: unknown) {
    switch (Number(value)) {
        case 1:
            return 'Operación constituye venta'

        case 2:
            return 'Ventas por efectuar'

        case 3:
            return 'Consignaciones'

        case 4:
            return 'Entrega gratuita'

        case 5:
            return 'Traslados internos'

        case 6:
            return 'Otros traslados no venta'

        case 7:
            return 'Guía de devolución'

        case 8:
            return 'Traslado para exportación'

        case 9:
            return 'Venta para exportación'

        default:
            return '-'
    }
}

function dispatchTypeName(value: unknown) {
    switch (Number(value)) {
        case 1:
            return 'Despacho por cuenta del receptor'

        case 2:
            return 'Despacho por cuenta del emisor a instalaciones del cliente'

        case 3:
            return 'Despacho por cuenta del emisor a otras instalaciones'

        default:
            return '-'
    }
}

function safeText(value: unknown) {
    const text = String(value || '').trim()

    return text || '-'
}

function drawHorizontalLine(
    pdf: PDFKit.PDFDocument,
    y: number,
    x1 = PAGE_LEFT,
    x2 = PAGE_RIGHT,
) {
    pdf.moveTo(x1, y).lineTo(x2, y).stroke()
}

function drawLabelValue(
    pdf: PDFKit.PDFDocument,
    label: string,
    value: unknown,
    x: number,
    y: number,
    width: number,
    labelWidth = 65,
) {
    pdf.font('Helvetica-Bold')
        .fontSize(7.5)
        .text(label, x, y, {
            width: labelWidth,
        })

    pdf.font('Helvetica')
        .fontSize(7.5)
        .text(safeText(value), x + labelWidth, y, {
            width: width - labelWidth,
        })
}

/**
 * ============================================================
 * CABECERA
 * ============================================================
 */

function drawIssuerHeader(
    pdf: PDFKit.PDFDocument,
    billingDocument: any,
    issuer: any,
    cedible: boolean,
) {
    /**
     * --------------------------------------------------------
     * EMISOR
     * --------------------------------------------------------
     */

    pdf.font('Helvetica-Bold')
        .fontSize(13)
        .text(issuer.razonSocial, PAGE_LEFT, 40, {
            width: 315,
        })

    let issuerY = 62

    pdf.font('Helvetica')
        .fontSize(8)
        .text(`RUT: ${issuer.rut}`, PAGE_LEFT, issuerY, {
            width: 315,
        })

    issuerY += 12

    pdf.text(`Giro: ${issuer.giro}`, PAGE_LEFT, issuerY, {
        width: 315,
    })

    issuerY += 12

    pdf.text(
        `${issuer.direccion}, ${issuer.comuna}, ${issuer.ciudad}`,
        PAGE_LEFT,
        issuerY,
        {
            width: 315,
        },
    )

    /**
     * --------------------------------------------------------
     * RECUADRO TRIBUTARIO
     * --------------------------------------------------------
     */

    const fiscalBoxX = 365
    const fiscalBoxY = 35
    const fiscalBoxWidth = 194
    const fiscalBoxHeight = 105

    pdf.lineWidth(1.4)
        .rect(
            fiscalBoxX,
            fiscalBoxY,
            fiscalBoxWidth,
            fiscalBoxHeight,
        )
        .stroke()

    pdf.font('Helvetica-Bold')
        .fontSize(10)
        .text(
            `R.U.T.: ${issuer.rut}`,
            fiscalBoxX + 8,
            fiscalBoxY + 12,
            {
                width: fiscalBoxWidth - 16,
                align: 'center',
            },
        )

    pdf.fontSize(10).text(
        documentName(billingDocument.document_type),
        fiscalBoxX + 8,
        fiscalBoxY + 38,
        {
            width: fiscalBoxWidth - 16,
            align: 'center',
        },
    )

    pdf.fontSize(15).text(
        `N° ${billingDocument.folio}`,
        fiscalBoxX + 8,
        fiscalBoxY + 70,
        {
            width: fiscalBoxWidth - 16,
            align: 'center',
        },
    )

    pdf.fontSize(8).text(
        'S.I.I.',
        fiscalBoxX + 8,
        fiscalBoxY + 92,
        {
            width: fiscalBoxWidth - 16,
            align: 'center',
        },
    )

    pdf.font('Helvetica')
        .fontSize(8)
        .text(
            `Fecha emisión: ${formatDate(billingDocument.createdAt)}`,
            fiscalBoxX,
            fiscalBoxY + fiscalBoxHeight + 8,
            {
                width: fiscalBoxWidth,
                align: 'right',
            },
        )

    if (cedible) {
        pdf.font('Helvetica-Bold')
            .fontSize(9)
            .text(
                'CEDIBLE',
                fiscalBoxX,
                fiscalBoxY + fiscalBoxHeight + 23,
                {
                    width: fiscalBoxWidth,
                    align: 'right',
                },
            )
    }
}

/**
 * ============================================================
 * RECEPTOR
 * ============================================================
 */

function drawReceiver(
    pdf: PDFKit.PDFDocument,
    billingDocument: any,
) {
    const boxY = 170
    const boxHeight = isDispatchGuide(
        billingDocument.document_type,
    )
        ? 108
        : 88

    pdf.lineWidth(0.7)
        .rect(PAGE_LEFT, boxY, PAGE_WIDTH, boxHeight)
        .stroke()

    const leftX = PAGE_LEFT + 8
    const rightX = 315

    let y = boxY + 9

    drawLabelValue(
        pdf,
        'SEÑOR(ES):',
        billingDocument.receiver_name,
        leftX,
        y,
        490,
        68,
    )

    y += 16

    drawLabelValue(
        pdf,
        'RUT:',
        billingDocument.receiver_rut,
        leftX,
        y,
        250,
        68,
    )

    drawLabelValue(
        pdf,
        'GIRO:',
        billingDocument.receiver_giro,
        rightX,
        y,
        230,
        48,
    )

    y += 16

    drawLabelValue(
        pdf,
        'DIRECCIÓN:',
        billingDocument.receiver_address,
        leftX,
        y,
        490,
        68,
    )

    y += 16

    drawLabelValue(
        pdf,
        'COMUNA:',
        billingDocument.receiver_comuna,
        leftX,
        y,
        250,
        68,
    )

    drawLabelValue(
        pdf,
        'CIUDAD:',
        billingDocument.receiver_ciudad,
        rightX,
        y,
        230,
        48,
    )

    /**
     * --------------------------------------------------------
     * DATOS ESPECÍFICOS GUÍA DE DESPACHO
     * --------------------------------------------------------
     */

    if (isDispatchGuide(billingDocument.document_type)) {
        y += 18

        drawLabelValue(
            pdf,
            'TRASLADO:',
            transferIndicatorName(
                billingDocument.dispatch_transfer_indicator,
            ),
            leftX,
            y,
            300,
            68,
        )

        drawLabelValue(
            pdf,
            'DESPACHO:',
            dispatchTypeName(billingDocument.dispatch_type),
            rightX,
            y,
            230,
            58,
        )
    }
}

/**
 * ============================================================
 * TRANSPORTE
 * ============================================================
 */

function drawTransport(
    pdf: PDFKit.PDFDocument,
    billingDocument: any,
) {
    if (!isDispatchGuide(billingDocument.document_type)) {
        return
    }

    const boxY = 283
    const boxHeight = 56

    pdf.lineWidth(0.7)
        .rect(PAGE_LEFT, boxY, PAGE_WIDTH, boxHeight)
        .stroke()

    const leftX = PAGE_LEFT + 8
    const middleX = 300

    drawLabelValue(
        pdf,
        'CHOFER:',
        billingDocument.dispatch_driver_name,
        leftX,
        boxY + 8,
        250,
        52,
    )

    drawLabelValue(
        pdf,
        'RUT:',
        billingDocument.dispatch_driver_rut,
        middleX,
        boxY + 8,
        250,
        38,
    )

    drawLabelValue(
        pdf,
        'PATENTE:',
        billingDocument.dispatch_vehicle_plate,
        leftX,
        boxY + 22,
        250,
        52,
    )

    drawLabelValue(
        pdf,
        'SALIDA:',
        `${formatDate(
            billingDocument.dispatch_departure_date,
        )} ${safeText(
            billingDocument.dispatch_departure_time,
        )}`,
        middleX,
        boxY + 22,
        250,
        48,
    )

    drawLabelValue(
        pdf,
        'DESTINO:',
        [
            billingDocument.dispatch_destination_address,
            billingDocument.dispatch_destination_commune,
            billingDocument.dispatch_destination_city,
        ]
            .filter(Boolean)
            .join(', '),
        leftX,
        boxY + 36,
        490,
        52,
    )
}

/**
 * ============================================================
 * TABLA DETALLE
 * ============================================================
 */

function drawDetailHeader(
    pdf: PDFKit.PDFDocument,
    billingDocument: any,
    y: number,
) {
    const noSaleGuide = isNoSaleDispatchGuide(
        billingDocument,
    )

    pdf.lineWidth(0.7)
        .rect(PAGE_LEFT, y, PAGE_WIDTH, 22)
        .stroke()

    if (noSaleGuide) {
        /**
         * Guía NO VENTA.
         *
         * No mostramos precios comerciales como
         * valores tributarios.
         */

        pdf.moveTo(82, y).lineTo(82, y + 22).stroke()

        pdf.moveTo(455, y).lineTo(455, y + 22).stroke()

        pdf.font('Helvetica-Bold')
            .fontSize(7.5)
            .text('N°', PAGE_LEFT + 4, y + 7, {
                width: 38,
                align: 'center',
            })

        pdf.text('DESCRIPCIÓN', 88, y + 7, {
            width: 360,
        })

        pdf.text('CANTIDAD', 460, y + 7, {
            width: 92,
            align: 'center',
        })

        return
    }

    const xLine = 72
    const xDescription = 78
    const xQuantity = 300
    const xUnit = 350
    const xDiscount = 420
    const xTotal = 485

    pdf.moveTo(xLine, y).lineTo(xLine, y + 22).stroke()

    pdf.moveTo(294, y).lineTo(294, y + 22).stroke()

    pdf.moveTo(344, y).lineTo(344, y + 22).stroke()

    pdf.moveTo(414, y).lineTo(414, y + 22).stroke()

    pdf.moveTo(479, y).lineTo(479, y + 22).stroke()

    pdf.font('Helvetica-Bold')
        .fontSize(7)
        .text('N°', PAGE_LEFT + 3, y + 7, {
            width: 30,
            align: 'center',
        })

    pdf.text('DESCRIPCIÓN', xDescription, y + 7, {
        width: 210,
    })

    pdf.text('CANT.', xQuantity, y + 7, {
        width: 38,
        align: 'center',
    })

    pdf.text('UNITARIO', xUnit, y + 7, {
        width: 58,
        align: 'right',
    })

    pdf.text('% DESC.', xDiscount, y + 7, {
        width: 52,
        align: 'right',
    })

    pdf.text('VALOR', xTotal, y + 7, {
        width: 68,
        align: 'right',
    })
}

function drawDetailRows(
    pdf: PDFKit.PDFDocument,
    billingDocument: any,
    items: any[],
    startY: number,
) {
    const noSaleGuide = isNoSaleDispatchGuide(
        billingDocument,
    )

    let y = startY + 22

    for (const item of items) {
        const description = safeText(item.description)

        const descriptionWidth = noSaleGuide ? 360 : 210

        pdf.font('Helvetica').fontSize(7.5)

        const descriptionHeight = pdf.heightOfString(
            description,
            {
                width: descriptionWidth,
            },
        )

        const rowHeight = Math.max(
            21,
            descriptionHeight + 8,
        )

        /**
         * Si la tabla supera el espacio disponible,
         * continuamos en una nueva página.
         */
        if (y + rowHeight > DETAIL_BOTTOM) {
            pdf.addPage()

            drawIssuerHeader(
                pdf,
                billingDocument,
                getIssuerConfig(),
                false,
            )

            const continuationY = 175

            pdf.font('Helvetica-Bold')
                .fontSize(8)
                .text(
                    'CONTINUACIÓN DE DETALLE',
                    PAGE_LEFT,
                    continuationY - 18,
                    {
                        width: PAGE_WIDTH,
                        align: 'center',
                    },
                )

            drawDetailHeader(
                pdf,
                billingDocument,
                continuationY,
            )

            y = continuationY + 22
        }

        pdf.lineWidth(0.4)
            .rect(
                PAGE_LEFT,
                y,
                PAGE_WIDTH,
                rowHeight,
            )
            .stroke()

        if (noSaleGuide) {
            pdf.moveTo(82, y)
                .lineTo(82, y + rowHeight)
                .stroke()

            pdf.moveTo(455, y)
                .lineTo(455, y + rowHeight)
                .stroke()

            pdf.text(
                String(item.line_number),
                PAGE_LEFT + 4,
                y + 6,
                {
                    width: 38,
                    align: 'center',
                },
            )

            pdf.text(
                description,
                88,
                y + 6,
                {
                    width: 360,
                },
            )

            pdf.text(
                formatQuantity(item.quantity),
                460,
                y + 6,
                {
                    width: 92,
                    align: 'center',
                },
            )
        } else {
            pdf.moveTo(72, y)
                .lineTo(72, y + rowHeight)
                .stroke()

            pdf.moveTo(294, y)
                .lineTo(294, y + rowHeight)
                .stroke()

            pdf.moveTo(344, y)
                .lineTo(344, y + rowHeight)
                .stroke()

            pdf.moveTo(414, y)
                .lineTo(414, y + rowHeight)
                .stroke()

            pdf.moveTo(479, y)
                .lineTo(479, y + rowHeight)
                .stroke()

            pdf.text(
                String(item.line_number),
                PAGE_LEFT + 3,
                y + 6,
                {
                    width: 30,
                    align: 'center',
                },
            )

            pdf.text(
                description,
                78,
                y + 6,
                {
                    width: 210,
                },
            )

            pdf.text(
                formatQuantity(item.quantity),
                300,
                y + 6,
                {
                    width: 38,
                    align: 'center',
                },
            )

            pdf.text(
                money(item.unit_price),
                350,
                y + 6,
                {
                    width: 58,
                    align: 'right',
                },
            )

            pdf.text(
                Number(item.discount_percentage || 0) > 0
                    ? `${Number(
                        item.discount_percentage,
                    )}%`
                    : '-',
                420,
                y + 6,
                {
                    width: 52,
                    align: 'right',
                },
            )

            pdf.text(
                money(item.net_amount),
                485,
                y + 6,
                {
                    width: 68,
                    align: 'right',
                },
            )
        }

        y += rowHeight
    }

    return y
}

/**
 * ============================================================
 * TOTALES
 * ============================================================
 */

function drawTotals(
    pdf: PDFKit.PDFDocument,
    billingDocument: any,
    items: any[],
    y: number,
) {
    const noSaleGuide = isNoSaleDispatchGuide(
        billingDocument,
    )

    const subtotal = items.reduce(
        (total: number, item: any) =>
            total +
            Number(item.quantity || 0) *
            Number(item.unit_price || 0),
        0,
    )

    const discountTotal = items.reduce(
        (total: number, item: any) =>
            total + Number(item.discount_amount || 0),
        0,
    )

    const boxX = 370
    const boxWidth = PAGE_RIGHT - boxX

    let currentY = Math.max(y + 15, 560)

    if (currentY > 620) {
        pdf.addPage()

        currentY = 80
    }

    /**
     * --------------------------------------------------------
     * GUÍA NO VENTA
     * --------------------------------------------------------
     */

    if (noSaleGuide) {
        pdf.lineWidth(0.7)
            .rect(boxX, currentY, boxWidth, 42)
            .stroke()

        pdf.font('Helvetica-Bold')
            .fontSize(9)
            .text(
                'TOTAL:',
                boxX + 10,
                currentY + 14,
                {
                    width: 70,
                },
            )

        pdf.fontSize(11).text(
            money(billingDocument.total_amount),
            boxX + 80,
            currentY + 12,
            {
                width: boxWidth - 90,
                align: 'right',
            },
        )

        return currentY + 52
    }

    /**
     * --------------------------------------------------------
     * DOCUMENTOS CON VALORES
     * --------------------------------------------------------
     */

    const rows: Array<{
        label: string
        value: string
        bold?: boolean
    }> = [
            {
                label: 'SUBTOTAL:',
                value: money(subtotal),
            },
        ]

    if (discountTotal > 0) {
        rows.push({
            label: 'DESCUENTOS:',
            value: `-${money(discountTotal)}`,
        })
    }

    rows.push(
        {
            label: 'NETO:',
            value: money(billingDocument.net_amount),
        },
        {
            label: 'IVA 19%:',
            value: money(billingDocument.tax_amount),
        },
        {
            label: 'TOTAL:',
            value: money(billingDocument.total_amount),
            bold: true,
        },
    )

    const boxHeight = rows.length * 18 + 12

    pdf.lineWidth(0.7)
        .rect(
            boxX,
            currentY,
            boxWidth,
            boxHeight,
        )
        .stroke()

    let rowY = currentY + 8

    for (const row of rows) {
        pdf.font(
            row.bold
                ? 'Helvetica-Bold'
                : 'Helvetica',
        )
            .fontSize(row.bold ? 9.5 : 8)
            .text(
                row.label,
                boxX + 8,
                rowY,
                {
                    width: 82,
                },
            )

        pdf.text(
            row.value,
            boxX + 90,
            rowY,
            {
                width: boxWidth - 98,
                align: 'right',
            },
        )

        rowY += 18
    }

    return currentY + boxHeight + 10
}

/**
 * ============================================================
 * TIMBRE ELECTRÓNICO
 * ============================================================
 */

function drawTimbre(
    pdf: PDFKit.PDFDocument,
    pdf417Buffer: Buffer,
    y: number,
) {
    let timbreY = y

    if (timbreY > 650) {
        pdf.addPage()

        timbreY = 80
    }

    const timbreX = PAGE_LEFT
    const timbreWidth = 285
    const timbreHeight = 95

    /**
     * IMPORTANTE:
     *
     * No modificamos el PDF417.
     *
     * Seguimos utilizando el Buffer generado
     * por pdf417.service.ts y mantenemos
     * su proporción mediante fit.
     */
    pdf.image(
        pdf417Buffer,
        timbreX,
        timbreY,
        {
            fit: [
                timbreWidth,
                timbreHeight,
            ],
            valign: 'center',
        },
    )

    let textY =
        timbreY +
        timbreHeight +
        5

    pdf.font('Helvetica-Bold')
        .fontSize(7.5)
        .text(
            'Timbre Electrónico SII',
            timbreX,
            textY,
            {
                width: timbreWidth,
                align: 'center',
            },
        )

    textY += 11

    const resolutionNumber =
        process.env.SII_RESOLUTION_NUMBER?.trim()

    const resolutionDate =
        process.env.SII_RESOLUTION_DATE?.trim()

    if (
        resolutionNumber ||
        resolutionDate
    ) {
        const resolutionText = [
            resolutionNumber
                ? `Res. SII N° ${resolutionNumber}`
                : null,

            resolutionDate
                ? `de ${resolutionDate}`
                : null,
        ]
            .filter(Boolean)
            .join(' ')

        pdf.font('Helvetica')
            .fontSize(6.8)
            .text(
                resolutionText,
                timbreX,
                textY,
                {
                    width: timbreWidth,
                    align: 'center',
                },
            )

        textY += 10
    }

    pdf.font('Helvetica')
        .fontSize(6.8)
        .text(
            'Verifique documento en www.sii.cl',
            timbreX,
            textY,
            {
                width: timbreWidth,
                align: 'center',
            },
        )

    return textY + 12
}

/**
 * ============================================================
 * RECEPCIÓN / CEDIBLE
 * ============================================================
 */

function drawCedibleReception(
    pdf: PDFKit.PDFDocument,
    y: number,
) {
    let currentY = y

    if (currentY > 675) {
        pdf.addPage()

        currentY = 100
    }

    const boxHeight = 78

    pdf.lineWidth(0.7)
        .rect(
            PAGE_LEFT,
            currentY,
            PAGE_WIDTH,
            boxHeight,
        )
        .stroke()

    pdf.font('Helvetica')
        .fontSize(7)
        .text(
            'Nombre:',
            PAGE_LEFT + 8,
            currentY + 8,
        )

    pdf.moveTo(PAGE_LEFT + 50, currentY + 18)
        .lineTo(PAGE_LEFT + 245, currentY + 18)
        .stroke()

    pdf.text(
        'RUT:',
        PAGE_LEFT + 275,
        currentY + 8,
    )

    pdf.moveTo(PAGE_LEFT + 305, currentY + 18)
        .lineTo(PAGE_RIGHT - 8, currentY + 18)
        .stroke()

    pdf.text(
        'Fecha:',
        PAGE_LEFT + 8,
        currentY + 28,
    )

    pdf.moveTo(PAGE_LEFT + 50, currentY + 38)
        .lineTo(PAGE_LEFT + 180, currentY + 38)
        .stroke()

    pdf.text(
        'Recinto:',
        PAGE_LEFT + 205,
        currentY + 28,
    )

    pdf.moveTo(PAGE_LEFT + 250, currentY + 38)
        .lineTo(PAGE_RIGHT - 8, currentY + 38)
        .stroke()

    pdf.text(
        'Firma:',
        PAGE_LEFT + 8,
        currentY + 48,
    )

    pdf.moveTo(PAGE_LEFT + 50, currentY + 60)
        .lineTo(PAGE_LEFT + 245, currentY + 60)
        .stroke()

    pdf.font('Helvetica')
        .fontSize(5.8)
        .text(
            'El acuse de recibo que se declara en este acto, de acuerdo a lo dispuesto en la normativa vigente, acredita la entrega de mercaderías o prestación de servicios.',
            PAGE_LEFT + 275,
            currentY + 46,
            {
                width: PAGE_RIGHT - (PAGE_LEFT + 283),
                align: 'justify',
            },
        )

    pdf.font('Helvetica-Bold')
        .fontSize(8)
        .text(
            'CEDIBLE',
            PAGE_LEFT,
            currentY + boxHeight + 5,
            {
                width: PAGE_WIDTH,
                align: 'right',
            },
        )

    return currentY + boxHeight + 20
}

/**
 * ============================================================
 * PIE DE PÁGINA
 * ============================================================
 */

function drawFooter(
    pdf: PDFKit.PDFDocument,
    folio: number,
    cedible: boolean,
) {
    pdf.font('Helvetica')
        .fontSize(6.5)
        .text(
            cedible
                ? `Documento generado electrónicamente — Folio ${folio} — CEDIBLE`
                : `Documento generado electrónicamente — Folio ${folio}`,
            PAGE_LEFT,
            PAGE_BOTTOM,
            {
                width: PAGE_WIDTH,
                align: 'center',
            },
        )
}

/**
 * ============================================================
 * PÁGINA COMPLETA
 * ============================================================
 */

function drawDocumentPage(context: PrintableContext) {
    const {
        pdf,
        billingDocument,
        items,
        issuer,
        pdf417Buffer,
        cedible,
    } = context

    drawIssuerHeader(
        pdf,
        billingDocument,
        issuer,
        cedible,
    )

    drawReceiver(
        pdf,
        billingDocument,
    )

    drawTransport(
        pdf,
        billingDocument,
    )

    const detailY = isDispatchGuide(
        billingDocument.document_type,
    )
        ? 350
        : DETAIL_TOP

    drawDetailHeader(
        pdf,
        billingDocument,
        detailY,
    )

    const detailEndY = drawDetailRows(
        pdf,
        billingDocument,
        items,
        detailY,
    )

    const totalsEndY = drawTotals(
        pdf,
        billingDocument,
        items,
        detailEndY,
    )

    const timbreEndY = drawTimbre(
        pdf,
        pdf417Buffer,
        Math.max(
            detailEndY + 15,
            totalsEndY - 105,
        ),
    )

    if (
        cedible &&
        isDispatchGuide(
            billingDocument.document_type,
        )
    ) {
        drawCedibleReception(
            pdf,
            Math.max(
                timbreEndY + 8,
                totalsEndY + 8,
            ),
        )
    }

    drawFooter(
        pdf,
        Number(billingDocument.folio),
        cedible,
    )
}

/**
 * ============================================================
 * GENERACIÓN PDF
 * ============================================================
 */

export async function generatePrintablePdf(
    documentId: string,
) {
    const billingDocument =
        await BillingDocument.findByPk(
            documentId,
            {
                include: [
                    {
                        model: BillingDocumentItem,
                        as: 'items',
                    },
                ],
            },
        )

    if (!billingDocument) {
        throw new Error(
            'Documento no encontrado',
        )
    }

    if (!billingDocument.xml_path) {
        throw new Error(
            'El documento no tiene XML generado',
        )
    }

    if (!billingDocument.folio) {
        throw new Error(
            'El documento no tiene folio asignado',
        )
    }

    const issuer = getIssuerConfig()

    const docJson =
        billingDocument.toJSON() as any

    const items = (
        docJson.items || []
    ).sort(
        (
            a: any,
            b: any,
        ) =>
            Number(a.line_number || 0) -
            Number(b.line_number || 0),
    )

    if (items.length === 0) {
        throw new Error(
            'El documento no contiene ítems',
        )
    }

    /**
     * ========================================================
     * TIMBRE
     * ========================================================
     */

    const tedXml =
        await extractTedFromXmlFile(
            billingDocument.xml_path,
        )

    const pdf417Buffer: Buffer =
        await generatePdf417Buffer(
            tedXml,
        )

    /**
     * ========================================================
     * ARCHIVO
     * ========================================================
     */

    const outputDir =
        path.resolve('output/pdf')

    await fsp.mkdir(
        outputDir,
        {
            recursive: true,
        },
    )

    const fileName =
        `dte-${billingDocument.document_type}-${billingDocument.folio}.pdf`

    const filePath =
        path.join(
            outputDir,
            fileName,
        )

    const pdf =
        new PDFDocument({
            size: 'A4',

            margin: PAGE_LEFT,

            info: {
                Title: `${documentName(
                    billingDocument.document_type,
                )} ${billingDocument.folio}`,

                Author:
                    issuer.razonSocial,
            },
        })

    const stream =
        fs.createWriteStream(
            filePath,
        )

    pdf.pipe(stream)

    /**
     * ========================================================
     * ORIGINAL
     * ========================================================
     */

    drawDocumentPage({
        pdf,
        billingDocument,
        items,
        issuer,
        pdf417Buffer,
        cedible: false,
    })

    /**
     * ========================================================
     * CEDIBLE
     *
     * Para DTE 52 generamos una segunda copia
     * utilizando exactamente el mismo documento.
     * ========================================================
     */

    if (
        isDispatchGuide(
            billingDocument.document_type,
        )
    ) {
        pdf.addPage()

        drawDocumentPage({
            pdf,
            billingDocument,
            items,
            issuer,
            pdf417Buffer,
            cedible: true,
        })
    }

    /**
     * ========================================================
     * FINALIZACIÓN
     * ========================================================
     */

    pdf.end()

    await new Promise<void>(
        (
            resolve,
            reject,
        ) => {
            stream.on(
                'finish',
                resolve,
            )

            stream.on(
                'error',
                reject,
            )
        },
    )

    /**
     * ========================================================
     * PERSISTENCIA
     * ========================================================
     */

    await billingDocument.update({
        pdf_print_path: filePath,

        printed_at: new Date(),

        print_count:
            Number(
                billingDocument.print_count ||
                0,
            ) + 1,
    })

    return {
        filePath,

        fileName,

        documentId:
            billingDocument.id,

        documentType:
            billingDocument.document_type,

        folio:
            billingDocument.folio,
    }
}