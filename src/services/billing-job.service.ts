import { BillingJob, BillingWebhookEvent } from '../models/index.js'

type CreateBillingJobInput = {
    provider: string
    type: string
    webhookEventId?: string | null
    externalPaymentId?: string | null
}

export async function createBillingJob(input: CreateBillingJobInput) {
    return BillingJob.create({
        provider: input.provider,
        type: input.type,
        webhook_event_id: input.webhookEventId || null,
        external_payment_id: input.externalPaymentId || null,
        status: 'pending',
        attempts: 0,
        error_message: null,
        processed_at: null,
    })
}

export async function getPendingBillingJobs(limit = 10) {
    return BillingJob.findAll({
        where: {
            status: 'pending',
        },
        include: [
            {
                model: BillingWebhookEvent,
                as: 'webhook_event',
            },
        ],
        order: [['createdAt', 'ASC']],
        limit,
    })
}

export async function markJobProcessing(job: BillingJob) {
    await job.update({
        status: 'processing',
        attempts: job.attempts + 1,
        error_message: null,
    })
}

export async function markJobProcessed(job: BillingJob) {
    await job.update({
        status: 'processed',
        processed_at: new Date(),
        error_message: null,
    })
}

export async function markJobError(job: BillingJob, error: unknown) {
    const message =
        error instanceof Error ? error.message : 'Error desconocido procesando job'

    await job.update({
        status: job.attempts >= 3 ? 'failed' : 'pending',
        error_message: message,
    })
}