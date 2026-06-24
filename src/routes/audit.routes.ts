import { Router } from 'express'
import { apiKeyMiddleware } from '../middlewares/api-key.middleware.js'
import {
    getBillingJobById,
    getBillingJobs,
    getWebhookEventById,
    getWebhookEvents,
    retryBillingJob,
} from '../controllers/audit.controller.js'

const router = Router()

router.use(apiKeyMiddleware)

router.get('/jobs', getBillingJobs)
router.get('/jobs/:id', getBillingJobById)

router.get('/webhook-events', getWebhookEvents)
router.get('/webhook-events/:id', getWebhookEventById)

router.patch('/jobs/:id/retry', retryBillingJob)

export default router