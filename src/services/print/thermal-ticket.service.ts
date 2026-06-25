import fs from 'fs/promises'
import path from 'path'
import { BillingDocument } from '../../models/index.js'
import { renderThermalTicket } from './thermal-ticket-renderer.service.js'

export async function generateThermalTicketFile(documentId: string) {
    const ticket = await renderThermalTicket(documentId)

    const document = await BillingDocument.findByPk(documentId)

    if (!document) {
        throw new Error('Documento no encontrado')
    }

    const outputDir = path.resolve('output/tickets')
    await fs.mkdir(outputDir, { recursive: true })

    const filePath = path.join(
        outputDir,
        `ticket-${document.document_type}-${document.folio}.txt`,
    )

    await fs.writeFile(filePath, ticket, 'utf-8')

    return {
        filePath,
        ticket,
    }
}