import { Router } from 'express'
import { apiKeyMiddleware } from '../middlewares/api-key.middleware.js'
import { receiveGenericPaymentWebhook } from '../controllers/webhook.controller.js'

const router = Router()

router.post(
    '/:provider/payment',
    apiKeyMiddleware,
    receiveGenericPaymentWebhook,
)

export default router