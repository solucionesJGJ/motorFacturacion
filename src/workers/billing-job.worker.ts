import 'dotenv/config'
import { sequelize, type BillingJob } from '../models/index.js'
import {
    getPendingBillingJobs,
    markJobError,
    markJobProcessed,
    markJobProcessing,
} from '../services/billing-job.service.js'
import { processLavaYaPayment } from '../services/providers/lava-ya/lava-ya.connector.js'

const POLL_INTERVAL_MS = Number(process.env.JOB_WORKER_INTERVAL_MS || 5000)

async function processJob(job: BillingJob) {
    console.log('Procesando job:', {
        id: job.id,
        provider: job.provider,
        type: job.type,
        external_payment_id: job.external_payment_id,
    })

    if (job.provider === 'lava-ya' && job.type === 'payment_invoice') {
        if (!job.external_payment_id) {
            throw new Error('Job Lava Ya sin external_payment_id')
        }

        const result = await processLavaYaPayment(
            job.external_payment_id,
            job.webhook_event_id,
        )

        console.log('Documento Lava Ya generado:', {
            documentId: result.document?.id,
            xmlPath: result.xmlPath,
            duplicated: result.duplicated || false,
        })

        return
    }

    throw new Error(`Provider no soportado: ${job.provider}`)
}

async function runOnce() {
    const jobs = await getPendingBillingJobs(10)

    if (jobs.length === 0) {
        return
    }

    for (const job of jobs) {
        try {
            await markJobProcessing(job)

            await processJob(job)

            await markJobProcessed(job)

            console.log('Job procesado:', job.id)
        } catch (error) {
            console.error('Error procesando job:', error)
            await markJobError(job, error)
        }
    }
}

async function main() {
    await sequelize.authenticate()

    console.log('Billing job worker conectado a BD')
    console.log(`Intervalo: ${POLL_INTERVAL_MS}ms`)

    setInterval(() => {
        runOnce().catch((error) => {
            console.error('Error en ciclo worker:', error)
        })
    }, POLL_INTERVAL_MS)
}

main()