import fs from 'fs/promises'
import type {
    BillingDocumentInput,
    BillingItem,
} from '../types/billing.type.js'

export async function parseTxtInvoice(
    filePath: string,
): Promise<BillingDocumentInput> {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

    const items: BillingItem[] = []

    const document: BillingDocumentInput = {
        documentType: 0,
        receiver: {
            rut: '',
            razonSocial: '',
        },
        items,
    }

    for (const line of lines) {
        const [key, ...rest] = line.split('=')
        const value = rest.join('=').trim()

        switch (key.trim().toUpperCase()) {
            case 'DOCUMENT_TYPE':
                document.documentType = Number(value)
                break

            case 'FOLIO':
                document.folio = Number(value)
                break

            case 'RECEIVER_RUT':
                document.receiver.rut = value
                break

            case 'RECEIVER_NAME':
                document.receiver.razonSocial = value
                break

            case 'RECEIVER_GIRO':
                document.receiver.giro = value
                break

            case 'RECEIVER_ADDRESS':
                document.receiver.address = value
                break

            case 'RECEIVER_COMUNA':
                document.receiver.comuna = value
                break

            case 'RECEIVER_CIUDAD':
                document.receiver.ciudad = value
                break

            case 'ITEM': {
                const [description, quantity, unitPrice] = value.split('|')

                items.push({
                    description,
                    quantity: Number(quantity),
                    unitPrice: Number(unitPrice),
                })

                break
            }
        }
    }

    return document
}