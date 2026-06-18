import { Router } from 'express'
import { createInvoiceFromApi } from '../controllers/billing.controller.js'

const router = Router()

router.post('/invoice', createInvoiceFromApi)

export default router