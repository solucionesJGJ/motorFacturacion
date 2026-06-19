import path from 'path'
import type { BillingDocumentInput } from '../types/billing.type.js'
import { parseJsonInvoice } from '../parsers/json.parser.js'
import { parseTxtInvoice } from '../parsers/txt.parser.js'

export async function processBillingFile(
    filePath: string,
): Promise<BillingDocumentInput> {
    const ext = path.extname(filePath).toLowerCase()

    if (ext === '.json') {
        return parseJsonInvoice(filePath)
    }

    if (ext === '.txt') {
        return parseTxtInvoice(filePath)
    }

    throw new Error(`Extensión no soportada: ${ext}`)
}