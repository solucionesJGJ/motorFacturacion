import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import PDFDocument from 'pdfkit'

import { BillingDocument, BillingDocumentItem } from '../../models/index.js'
import { getIssuerConfig } from '../../config/issuer.config.js'
import { extractTedFromXmlFile } from './ted-extractor.service.js'
import { generatePdf417Buffer } from './pdf417.service.js'

const PAGE_LEFT = 40
const PAGE_RIGHT = 555
const PAGE_WIDTH = PAGE_RIGHT - PAGE_LEFT

function money(value: unknown) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(Number(value || 0))
}

function formatDate(value: unknown) {
    if (!value) {
        return '-'
    }

    const date = new Date(String(value))

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

function drawLine(
    pdf: PDFKit.PDFDocument,
    y: number,
    x1 = PAGE_LEFT,
    x2 = PAGE_RIGHT,
) {
    pdf.moveTo(x1, y).lineTo(x2, y).stroke()
}

function drawTableHeader(pdf: PDFKit.PDFDocument, y: number) {
    const columns = {
        description: 40,
        quantity: 300,
        unitPrice: 350,
        discount: 415,
        total: 485,
    }

    pdf.font('Helvetica-Bold').fontSize(8)

    pdf.text('DESCRIPCIÓN', columns.description, y, {
        width: 250,
    })

    pdf.text('CANT.', columns.quantity, y, {
        width: 45,
        align: 'right',
    })

    pdf.text('UNITARIO', columns.unitPrice, y, {
        width: 60,
        align: 'right',
    })

    pdf.text('DESC.', columns.discount, y, {
        width: 60,
        align: 'right',
    })

    pdf.text('TOTAL', columns.total, y, {
        width: 70,
        align: 'right',
    })

    drawLine(pdf, y + 15)

    pdf.font('Helvetica')

    pdf.y = y + 23
}

function drawFooter(pdf: PDFKit.PDFDocument, folio: number) {
    pdf.font('Helvetica')
        .fontSize(7)
        .text(
            `Documento generado electrónicamente — Folio ${folio}`,
            PAGE_LEFT,
            790,
            {
                width: PAGE_WIDTH,
                align: 'center',
            },
        )
}

export async function generatePrintablePdf(documentId: string) {
    const billingDocument = await BillingDocument.findByPk(documentId, {
        include: [
            {
                model: BillingDocumentItem,
                as: 'items',
            },
        ],
    })

    if (!billingDocument) {
        throw new Error('Documento no encontrado')
    }

    if (!billingDocument.xml_path) {
        throw new Error('El documento no tiene XML generado')
    }

    if (!billingDocument.folio) {
        throw new Error('El documento no tiene folio asignado')
    }

    const issuer = getIssuerConfig()

    const docJson = billingDocument.toJSON() as any

    const items = docJson.items || []

    if (items.length === 0) {
        throw new Error('El documento no contiene ítems')
    }

    /*
     * ======================================================
     * TOTALES COMERCIALES
     * ======================================================
     */

    const subtotal = items.reduce(
        (total: number, item: any) =>
            total +
            Number(
                item.line_subtotal ??
                Number(item.quantity || 0) * Number(item.unit_price || 0),
            ),
        0,
    )

    const discountTotal = items.reduce(
        (total: number, item: any) =>
            total + Number(item.discount_amount || 0),
        0,
    )

    /*
     * ======================================================
     * TIMBRE
     * ======================================================
     */

    const tedXml = await extractTedFromXmlFile(billingDocument.xml_path)

    /*
     * generatePdf417Buffer garantiza Promise<Buffer>.
     *
     * PDFKit recibe exactamente un Buffer válido como
     * fuente de imagen.
     */

    const pdf417Buffer: Buffer = await generatePdf417Buffer(tedXml)

    /*
     * ======================================================
     * ARCHIVO
     * ======================================================
     */

    const outputDir = path.resolve('output/pdf')

    await fsp.mkdir(outputDir, {
        recursive: true,
    })

    const fileName = `dte-${billingDocument.document_type}-${billingDocument.folio}.pdf`

    const filePath = path.join(outputDir, fileName)

    const pdf = new PDFDocument({
        size: 'A4',

        margin: PAGE_LEFT,

        info: {
            Title: `${documentName(
                billingDocument.document_type,
            )} ${billingDocument.folio}`,

            Author: issuer.razonSocial,
        },
    })

    const stream = fs.createWriteStream(filePath)

    pdf.pipe(stream)

    /*
     * ======================================================
     * CABECERA EMISOR
     * ======================================================
     */

    pdf.font('Helvetica-Bold')
        .fontSize(15)
        .text(issuer.razonSocial, PAGE_LEFT, 42, {
            width: 315,
        })

    pdf.font('Helvetica')
        .fontSize(8.5)
        .text(`RUT: ${issuer.rut}`, PAGE_LEFT, 66, {
            width: 315,
        })

    pdf.text(`Giro: ${issuer.giro}`, {
        width: 315,
    })

    pdf.text(`${issuer.direccion}, ${issuer.comuna}, ${issuer.ciudad}`, {
        width: 315,
    })

    /*
     * ======================================================
     * RECUADRO TRIBUTARIO
     * ======================================================
     */

    const fiscalBoxX = 375

    const fiscalBoxY = 40

    const fiscalBoxWidth = 180

    const fiscalBoxHeight = 112

    pdf.lineWidth(1.1)
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
            fiscalBoxX + 10,
            fiscalBoxY + 15,
            {
                width: fiscalBoxWidth - 20,
                align: 'center',
            },
        )

    pdf.fontSize(11).text(
        documentName(billingDocument.document_type),
        fiscalBoxX + 10,
        fiscalBoxY + 40,
        {
            width: fiscalBoxWidth - 20,
            align: 'center',
        },
    )

    pdf.fontSize(15).text(
        `N° ${billingDocument.folio}`,
        fiscalBoxX + 10,
        fiscalBoxY + 76,
        {
            width: fiscalBoxWidth - 20,
            align: 'center',
        },
    )

    pdf.fontSize(8).text(
        'S.I.I.',
        fiscalBoxX + 10,
        fiscalBoxY + 98,
        {
            width: fiscalBoxWidth - 20,
            align: 'center',
        },
    )

    pdf.font('Helvetica')
        .fontSize(8.5)
        .text(
            `Fecha emisión: ${formatDate(billingDocument.createdAt)}`,
            350,
            162,
            {
                width: 205,
                align: 'right',
            },
        )

    /*
     * ======================================================
     * RECEPTOR
     * ======================================================
     */

    const receiverBoxY = 185

    const receiverBoxHeight = 78

    pdf.lineWidth(0.8)
        .rect(
            PAGE_LEFT,
            receiverBoxY,
            PAGE_WIDTH,
            receiverBoxHeight,
        )
        .stroke()

    const receiverLeft = PAGE_LEFT + 10

    const receiverRight = 315

    const receiverTextY = receiverBoxY + 10

    pdf.font('Helvetica-Bold')
        .fontSize(8.5)
        .text(
            'SEÑOR(ES):',
            receiverLeft,
            receiverTextY,
            {
                continued: true,
            },
        )

    pdf.font('Helvetica').text(
        ` ${billingDocument.receiver_name || '-'}`,
    )

    pdf.font('Helvetica-Bold').text(
        'RUT:',
        receiverLeft,
        receiverTextY + 18,
        {
            continued: true,
        },
    )

    pdf.font('Helvetica').text(
        ` ${billingDocument.receiver_rut || '-'}`,
    )

    pdf.font('Helvetica-Bold').text(
        'GIRO:',
        receiverRight,
        receiverTextY + 18,
        {
            continued: true,
        },
    )

    pdf.font('Helvetica').text(
        ` ${billingDocument.receiver_giro || '-'}`,
    )

    pdf.font('Helvetica-Bold').text(
        'DIRECCIÓN:',
        receiverLeft,
        receiverTextY + 38,
        {
            continued: true,
        },
    )

    pdf.font('Helvetica').text(
        ` ${billingDocument.receiver_address || '-'}`,
    )

    pdf.font('Helvetica-Bold').text(
        'COMUNA:',
        receiverRight,
        receiverTextY + 38,
        {
            continued: true,
        },
    )

    pdf.font('Helvetica').text(
        ` ${billingDocument.receiver_comuna || '-'}`,
    )

    if (billingDocument.receiver_ciudad) {
        pdf.font('Helvetica-Bold').text(
            'CIUDAD:',
            receiverRight,
            receiverTextY + 55,
            {
                continued: true,
            },
        )

        pdf.font('Helvetica').text(
            ` ${billingDocument.receiver_ciudad}`,
        )
    }

    /*
     * ======================================================
     * TABLA DETALLE
     * ======================================================
     */

    pdf.y = receiverBoxY + receiverBoxHeight + 22

    drawTableHeader(pdf, pdf.y)

    const columns = {
        description: PAGE_LEFT,
        quantity: 300,
        unitPrice: 350,
        discount: 415,
        total: 485,
    }

    for (const item of items) {
        /*
         * Dejamos margen suficiente para
         * totales y timbre.
         *
         * Si existen muchos ítems,
         * continuamos en página nueva.
         */

        if (pdf.y > 575) {
            pdf.addPage()

            pdf.y = 50

            drawTableHeader(pdf, pdf.y)
        }

        const rowY = pdf.y

        const quantity = Number(item.quantity || 0)

        const unitPrice = Number(item.unit_price || 0)

        const discountPercentage = Number(
            item.discount_percentage || 0,
        )

        const discountAmount = Number(
            item.discount_amount || 0,
        )

        const lineTotal = Number(
            item.net_amount ??
            item.line_total ??
            0,
        )

        const description = String(
            item.description || '-',
        )

        const descriptionHeight = pdf.heightOfString(
            description,
            {
                width: 245,
            },
        )

        const rowHeight = Math.max(
            18,
            descriptionHeight +
            (discountAmount > 0 ? 14 : 4),
        )

        pdf.font('Helvetica')
            .fontSize(8)
            .text(
                description,
                columns.description,
                rowY,
                {
                    width: 245,
                },
            )

        pdf.text(
            String(quantity),
            columns.quantity,
            rowY,
            {
                width: 45,
                align: 'right',
            },
        )

        pdf.text(
            money(unitPrice),
            columns.unitPrice,
            rowY,
            {
                width: 60,
                align: 'right',
            },
        )

        pdf.text(
            discountPercentage > 0
                ? `${discountPercentage}%`
                : '-',
            columns.discount,
            rowY,
            {
                width: 60,
                align: 'right',
            },
        )

        pdf.text(
            money(lineTotal),
            columns.total,
            rowY,
            {
                width: 70,
                align: 'right',
            },
        )

        if (discountAmount > 0) {
            pdf.font('Helvetica')
                .fontSize(7)
                .text(
                    `Descuento aplicado: -${money(
                        discountAmount,
                    )}`,
                    columns.description + 8,
                    rowY + descriptionHeight + 2,
                    {
                        width: 230,
                    },
                )
        }

        pdf.y = rowY + rowHeight
    }

    /*
     * Línea inferior de tabla
     */

    drawLine(pdf, pdf.y + 2)

    pdf.y += 16

    /*
     * ======================================================
     * TOTALES
     * ======================================================
     */

    if (pdf.y > 625) {
        pdf.addPage()

        pdf.y = 50
    }

    const totalBoxX = 350

    const labelWidth = 105

    const amountWidth = 100

    let totalY = pdf.y

    const totalRow = (
        label: string,
        value: string,
        bold = false,
        size = 8.5,
    ) => {
        pdf.font(
            bold
                ? 'Helvetica-Bold'
                : 'Helvetica',
        )
            .fontSize(size)
            .text(
                label,
                totalBoxX,
                totalY,
                {
                    width: labelWidth,
                },
            )

        pdf.text(
            value,
            totalBoxX + labelWidth,
            totalY,
            {
                width: amountWidth,
                align: 'right',
            },
        )

        totalY += bold ? 18 : 14
    }

    totalRow(
        'Subtotal:',
        money(subtotal),
    )

    if (discountTotal > 0) {
        totalRow(
            'Descuentos:',
            `-${money(discountTotal)}`,
        )
    }

    totalRow(
        'Neto:',
        money(billingDocument.net_amount),
    )

    totalRow(
        'IVA 19%:',
        money(billingDocument.tax_amount),
    )

    drawLine(
        pdf,
        totalY + 2,
        totalBoxX,
        PAGE_RIGHT,
    )

    totalY += 10

    totalRow(
        'TOTAL:',
        money(billingDocument.total_amount),
        true,
        11,
    )

    pdf.y = totalY + 12

    /*
     * ======================================================
     * TIMBRE ELECTRÓNICO
     * ======================================================
     */

    if (pdf.y > 670) {
        pdf.addPage()

        pdf.y = 60
    }

    const timbreY = pdf.y

    const timbreX = PAGE_LEFT

    const timbreWidth = 285

    const timbreHeight = 105

    /*
     * "fit" mantiene la proporción real
     * del PDF417.
     *
     * Así evitamos aplastarlo o estirarlo
     * manualmente.
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

    /*
     * Dejamos aire blanco alrededor
     * del código para no interferir
     * con su lectura.
     */

    const timbreTextY =
        timbreY +
        timbreHeight +
        7

    pdf.font('Helvetica-Bold')
        .fontSize(8)
        .text(
            'Timbre Electrónico SII',
            PAGE_LEFT,
            timbreTextY,
            {
                width: timbreWidth,
                align: 'center',
            },
        )

    /*
     * Resolución SII opcional.
     *
     * Mientras no existan valores reales
     * configurados, no imprimimos
     * una línea incompleta.
     */

    const resolutionNumber =
        process.env.SII_RESOLUTION_NUMBER?.trim()

    const resolutionDate =
        process.env.SII_RESOLUTION_DATE?.trim()

    let verificationY =
        timbreTextY +
        12

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
            .fontSize(7)
            .text(
                resolutionText,
                PAGE_LEFT,
                verificationY,
                {
                    width: 255,
                    align: 'center',
                },
            )

        verificationY += 11
    }

    pdf.font('Helvetica')
        .fontSize(7)
        .text(
            'Verifique documento en www.sii.cl',
            PAGE_LEFT,
            verificationY,
            {
                width: 255,
                align: 'center',
            },
        )

    /*
     * ======================================================
     * PIE
     * ======================================================
     */

    drawFooter(
        pdf,
        Number(billingDocument.folio),
    )

    /*
     * ======================================================
     * FINALIZACIÓN
     * ======================================================
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

    /*
     * ======================================================
     * PERSISTENCIA DE IMPRESIÓN
     * ======================================================
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

        documentId: billingDocument.id,

        documentType:
            billingDocument.document_type,

        folio:
            billingDocument.folio,
    }
}