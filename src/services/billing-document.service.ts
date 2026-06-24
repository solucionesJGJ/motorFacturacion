import type { NormalizedBillingDocument } from '../types/normalized-billing.types.js'
import {
    BillingDocument,
    BillingDocumentItem,
    sequelize,
} from '../models/index.js'
import { assignNextFolio } from './folio.service.js'

type CreateBillingDocumentOptions = {
    sourceType: string
    sourceFilename?: string | null
    externalProvider?: string | null
    externalOrderId?: string | null
    externalPaymentId?: string | null
}

export async function createBillingDocument(
    document: NormalizedBillingDocument,
    options: CreateBillingDocumentOptions,
) {
    return sequelize.transaction(async (transaction) => {

        const assignedFolio = document.folio
            ? { folio: document.folio, cafId: null }
            : await assignNextFolio(document.documentType, transaction)

        const billingDocument = await BillingDocument.create(
            {
                source_type: options.sourceType,
                source_filename: options.sourceFilename || null,
                external_provider: options.externalProvider || null,
                external_order_id: options.externalOrderId || null,
                external_payment_id: options.externalPaymentId || null,
                document_type: document.documentType,
                folio: assignedFolio.folio,
                caf_id: assignedFolio.cafId,
                receiver_rut: document.receiverRut,
                receiver_name: document.receiverName,
                receiver_giro: document.receiverGiro || null,
                receiver_address: document.receiverAddress || null,
                receiver_comuna: document.receiverComuna || null,
                receiver_ciudad: document.receiverCiudad || null,
                net_amount: document.netAmount,
                tax_amount: document.taxAmount,
                total_amount: document.totalAmount,
                status: 'validated',
                sii_track_id: null,
                xml_path: null,
                pdf_path: null,
                error_message: null,
            },
            { transaction },
        )

        await BillingDocumentItem.bulkCreate(
            document.items.map((item) => ({
                billing_document_id: billingDocument.id,
                line_number: item.lineNumber,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                net_amount: item.netAmount,
                tax_amount: item.taxAmount,
                total_amount: item.totalAmount,
            })),
            { transaction },
        )

        return BillingDocument.findByPk(billingDocument.id, {
            include: [{ model: BillingDocumentItem, as: 'items' }],
            transaction,
        })
    })
}