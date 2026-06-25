import type { Request, Response } from 'express'
import {
    BillingJob,
    BillingWebhookEvent,
} from '../models/index.js'
import { retryFailedBillingJob } from '../services/billing-job.service.js'

function getParamId(req: Request) {
    return typeof req.params.id === 'string' ? req.params.id : null
}

export async function getBillingJobs(req: Request, res: Response) {
    try {
        const { status, provider } = req.query

        const where: any = {}

        if (status) where.status = status
        if (provider) where.provider = provider

        const jobs = await BillingJob.findAll({
            where,
            include: [
                {
                    model: BillingWebhookEvent,
                    as: 'webhook_event',
                },
            ],
            order: [['createdAt', 'DESC']],
        })

        return res.json({
            ok: true,
            data: jobs,
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: 'Error obteniendo jobs',
        })
    }
}

export async function getBillingJobById(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const job = await BillingJob.findByPk(id, {
            include: [
                {
                    model: BillingWebhookEvent,
                    as: 'webhook_event',
                },
            ],
        })

        if (!job) {
            return res.status(404).json({
                ok: false,
                message: 'Job no encontrado',
            })
        }

        return res.json({
            ok: true,
            data: job,
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: 'Error obteniendo job',
        })
    }
}

export async function getWebhookEvents(req: Request, res: Response) {
    try {
        const { status, provider, event_type } = req.query

        const where: any = {}

        if (status) where.status = status
        if (provider) where.provider = provider
        if (event_type) where.event_type = event_type

        const events = await BillingWebhookEvent.findAll({
            where,
            include: [
                {
                    model: BillingJob,
                    as: 'jobs',
                },
            ],
            order: [['createdAt', 'DESC']],
        })

        return res.json({
            ok: true,
            data: events,
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: 'Error obteniendo eventos webhook',
        })
    }
}

export async function getWebhookEventById(req: Request, res: Response) {
    try {

        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }


        const event = await BillingWebhookEvent.findByPk(id, {
            include: [
                {
                    model: BillingJob,
                    as: 'jobs',
                },
            ],
        })

        if (!event) {
            return res.status(404).json({
                ok: false,
                message: 'Evento webhook no encontrado',
            })
        }

        return res.json({
            ok: true,
            data: event,
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: 'Error obteniendo evento webhook',
        })
    }
}

/**
 * Moves a failed billing job back to pending so the worker can process it again.
 * Non-failed jobs are rejected by the job service.
 */
export async function retryBillingJob(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const job = await retryFailedBillingJob(id)

        return res.json({
            ok: true,
            message: 'Job marcado para reintento correctamente',
            data: job,
        })
    } catch (error: any) {
        console.error(error)

        return res.status(400).json({
            ok: false,
            message: error.message || 'Error reintentando job',
        })
    }
}
