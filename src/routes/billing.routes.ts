import { Router } from 'express'
import { createInvoiceFromApi } from '../controllers/billing.controller.js'
import {
    generateBillingDocumentXml,
    getBillingDocumentById,
    getBillingFileImportById,
    listBillingDocuments,
    listBillingImports,
    retryBillingImport,
} from '../controllers/billing-operations.controller.js'
import { apiKeyMiddleware } from '../middlewares/api-key.middleware.js'

const router = Router()
router.use(apiKeyMiddleware)
router.post('/invoice', createInvoiceFromApi)
router.get('/documents', listBillingDocuments)
router.get('/documents/:id', getBillingDocumentById)
router.post('/documents/:id/generate-xml', generateBillingDocumentXml)
router.get('/imports', listBillingImports)
router.get('/imports/:id', getBillingFileImportById)
router.post('/imports/:id/retry', retryBillingImport)

export default router
