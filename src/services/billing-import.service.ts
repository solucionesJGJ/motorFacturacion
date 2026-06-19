import path from 'path'
import type { BillingDocumentInput } from '../types/billing.types.js'
import type { NormalizedBillingDocument } from '../types/normalized-billing.types.js'
import { parseJsonInvoice } from '../parsers/json.parser.js'
import { parseTxtInvoice } from '../parsers/txt.parser.js'
import { validateBillingInput } from './billing-validator.service.js'
import { normalizeBillingInput } from './billing-normalizer.service.js'

async function parseBillingFile(filePath: string): Promise<BillingDocumentInput> {
    const ext = path.extname(filePath).toLowerCase()

    if (ext === '.json') {
        return parseJsonInvoice(filePath)
    }

    if (ext === '.txt') {
        return parseTxtInvoice(filePath)
    }

    throw new Error(`Extensión no soportada: ${ext}`)
}

export async function processBillingFile(
    filePath: string,
): Promise<NormalizedBillingDocument> {
    const input = await parseBillingFile(filePath)

    const validation = validateBillingInput(input)

    if (!validation.valid) {
        throw new Error(validation.errors.join(' | '))
    }

    return normalizeBillingInput(input)
}