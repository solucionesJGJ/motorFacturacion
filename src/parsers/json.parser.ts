import fs from 'fs/promises'
import type { BillingDocumentInput } from '../types/billing.types.js'

export async function parseJsonInvoice(
    filePath: string,
): Promise<BillingDocumentInput> {
    const content = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(content)

    return data as BillingDocumentInput
}