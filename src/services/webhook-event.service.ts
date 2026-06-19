import { BillingWebhookEvent } from '../models/index.js'

type RegisterWebhookEventInput = {
    provider: string
    externalEventId: string
    externalPaymentId?: string | null
    eventType: string
    payload: object
}

export async function registerWebhookEvent(input: RegisterWebhookEventInput) {
    const [event, created] = await BillingWebhookEvent.findOrCreate({
        where: {
            provider: input.provider,
            external_event_id: input.externalEventId,
        },
        defaults: {
            provider: input.provider,
            external_event_id: input.externalEventId,
            external_payment_id: input.externalPaymentId || null,
            event_type: input.eventType,
            payload: input.payload,
            status: 'received',
            error_message: null,
            processed_at: null,
        },
    })

    return {
        event,
        created,
        duplicated: !created,
    }
}