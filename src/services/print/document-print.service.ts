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

function money(value: unknown) {
    return `$${Number(value || 0).toLocaleString('es-CL')}`
}

export async function generatePrintablePdf(documentId: string) {
    const billingDocument = await BillingDocument.findByPk(documentId, {
        include: [{ model: BillingDocumentItem, as: 'items' }],
    })

    if (!billingDocument) {
        throw new Error('Documento no encontrado')
    }

    if (!billingDocument.xml_path) {
        throw new Error('El documento no tiene XML generado')
    }

    const issuer = getIssuerConfig()
    const docJson = billingDocument.toJSON() as any
    const items = docJson.items || []

    const tedXml = await extractTedFromXmlFile(billingDocument.xml_path)
    const pdf417Buffer = await generatePdf417Buffer(tedXml)

    const outputDir = path.resolve('output/pdf')
    await fsp.mkdir(outputDir, { recursive: true })

    const filePath = path.join(
        outputDir,
        `print-${billingDocument.document_type}-${billingDocument.folio}.pdf`,
    )

    const pdf = new PDFDocument({
        size: 'A4',
        margin: 40,
    })

    const stream = fs.createWriteStream(filePath)
    pdf.pipe(stream)

    pdf.fontSize(14).text(issuer.razonSocial, { align: 'left' })
    pdf.fontSize(9).text(`RUT: ${issuer.rut}`)
    pdf.text(`Giro: ${issuer.giro}`)
    pdf.text(`${issuer.direccion}, ${issuer.comuna}, ${issuer.ciudad}`)

    pdf.moveDown()

    pdf
        .fontSize(13)
        .text(`DTE ${billingDocument.document_type}`, { align: 'right' })
    pdf
        .fontSize(11)
        .text(`Folio: ${billingDocument.folio}`, { align: 'right' })

    pdf.moveDown()

    pdf.fontSize(10).text(`Receptor: ${billingDocument.receiver_name}`)
    pdf.text(`RUT: ${billingDocument.receiver_rut}`)
    pdf.text(`Giro: ${billingDocument.receiver_giro || '-'}`)
    pdf.text(
        `Dirección: ${billingDocument.receiver_address || '-'}, ${billingDocument.receiver_comuna || '-'}`,
    )

    pdf.moveDown()

    pdf.fontSize(11).text('Detalle', { underline: true })
    pdf.moveDown(0.5)

    items.forEach((item: any) => {
        pdf
            .fontSize(9)
            .text(
                `${item.line_number}. ${item.description} | Cant: ${item.quantity} | Unit: ${money(item.unit_price)} | Total: ${money(item.net_amount)}`,
            )
    })

    pdf.moveDown()

    pdf.fontSize(10).text(`Neto: ${money(billingDocument.net_amount)}`, {
        align: 'right',
    })
    pdf.text(`IVA: ${money(billingDocument.tax_amount)}`, { align: 'right' })
    pdf.fontSize(12).text(`Total: ${money(billingDocument.total_amount)}`, {
        align: 'right',
    })

    pdf.moveDown(2)

    pdf.image(pdf417Buffer, 40, pdf.y, {
        width: 230,
    })

    pdf.moveDown(5)
    pdf.fontSize(8).text('Timbre electrónico SII')
    pdf.text('Verifique documento en www.sii.cl')

    pdf.end()

    await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve)
        stream.on('error', reject)
    })

    await billingDocument.update({
        pdf_print_path: filePath,
        printed_at: new Date(),
        print_count: Number(billingDocument.print_count || 0) + 1,
    })

    return {
        filePath,
    }
}