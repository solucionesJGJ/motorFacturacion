import { validateBillingInput } from '../../billing-validator.service.js'
import { normalizeBillingInput } from '../../billing-normalizer.service.js'
import { createBillingDocument } from '../../billing-document.service.js'
import { generateDteXml } from '../../dte-xml.services.js'
import { LavaYaClient } from './lava-ya.client.js'
import { mapLavaYaToBillingInput } from './lava-ya.mapper.js'
import { BillingDocument } from '../../../models/index.js'

export async function processLavaYaPayment(
    paymentId: string,
    webhookEventId?: string | null,
) {
    const baseUrl = process.env.LAVAYA_API_URL
    const apiKey = process.env.LAVAYA_API_KEY

    if (!baseUrl || !apiKey) {
        throw new Error('LAVAYA_API_URL o LAVAYA_API_KEY no configuradas')
    }

    const client = new LavaYaClient(baseUrl, apiKey)

    const payment = await client.getPayment(paymentId)

    if (payment.status !== 'paid' && payment.status !== 'completed') {
        throw new Error(`Pago Lava Ya no está completado: ${payment.status}`)
    }

    const order = await client.getOrder(payment.order_id)

    const billingInput = mapLavaYaToBillingInput({
        payment,
        order,
    })

    const validation = validateBillingInput(billingInput)

    if (!validation.valid) {
        throw new Error(validation.errors.join(' | '))
    }

    const normalized = normalizeBillingInput(billingInput)

    const existingDocument = await BillingDocument.findOne({
        where: {
            external_provider: 'lava-ya',
            external_payment_id: payment.id,
        },
    })

    if (existingDocument) {
        return {
            payment,
            order,
            document: existingDocument,
            xmlPath: existingDocument.xml_path,
            webhookEventId,
            duplicated: true,
        }
    }

    const document = await createBillingDocument(normalized, {
        sourceType: 'webhook',
        externalProvider: 'lava-ya',
        externalOrderId: order.id,
        externalPaymentId: payment.id,
    })

    if (!document) {
        throw new Error('No se pudo crear documento desde Lava Ya')
    }

    const xmlResult = await generateDteXml(document.id)

    return {
        payment,
        order,
        document: xmlResult.document,
        xmlPath: xmlResult.xmlPath,
        webhookEventId,
    }
}