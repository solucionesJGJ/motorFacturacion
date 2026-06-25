import type { Request, Response } from 'express'
import { registerWebhookEvent } from '../services/webhook-event.service.js'
import { createBillingJob } from '../services/billing-job.service.js'

/**
 * Receives a provider payment webhook and records it idempotently.
 * New events enqueue a billing job; duplicates are acknowledged without a new job.
 */
export async function receiveGenericPaymentWebhook(
    req: Request,
    res: Response,
) {
    try {
        const provider = String(req.params.provider)
        const payload = req.body

        const externalEventId =
            payload.event_id ||
            payload.id ||
            payload.eventId ||
            payload.uuid

        const externalPaymentId =
            payload.payment_id ||
            payload.paymentId ||
            payload.transaction_id ||
            payload.transactionId ||
            payload.sale_id ||
            payload.saleId ||
            null

        const eventType =
            payload.event_type ||
            payload.type ||
            payload.event ||
            'payment.received'

        if (!provider) {
            return res.status(400).json({
                ok: false,
                message: 'provider es obligatorio',
            })
        }

        if (!externalEventId) {
            return res.status(400).json({
                ok: false,
                message: 'El evento debe incluir event_id, id, eventId o uuid',
            })
        }

        const result = await registerWebhookEvent({
            provider,
            externalEventId,
            externalPaymentId,
            eventType,
            payload,
        })

        if (!result.duplicated) {
            await createBillingJob({
                provider,
                type: 'payment_invoice',
                webhookEventId: result.event.id,
                externalPaymentId,
            })
        }

        return res.status(result.duplicated ? 200 : 201).json({
            ok: true,
            duplicated: result.duplicated,
            message: result.duplicated
                ? 'Evento duplicado recibido previamente'
                : 'Evento recibido correctamente',
            data: {
                id: result.event.id,
                provider: result.event.provider,
                external_event_id: result.event.external_event_id,
                external_payment_id: result.event.external_payment_id,
                event_type: result.event.event_type,
                status: result.event.status,
            },
        })
    } catch (error: any) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: error.message || 'Error recibiendo webhook',
        })
    }
}
