import { Router } from 'express'
import {
    createInvoiceFromApi,
    downloadPrintedDocument,
    generateBillingThermalTicket,
    printBillingDocument,
    signBillingDocumentXml,
    testCertificate,
    processBillingDocumentFromApi,
    getBillingDocumentPdf,
} from '../controllers/billing.controller.js'
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
router.post('/documents/:id/process', processBillingDocumentFromApi)
router.get('/documents', listBillingDocuments)
router.get('/documents/:id', getBillingDocumentById)
router.get('/documents/:id/pdf', getBillingDocumentPdf)
router.post('/documents/:id/generate-xml', generateBillingDocumentXml)
router.post('/documents/:id/sign-xml', signBillingDocumentXml)
router.post('/documents/:id/print', printBillingDocument)
router.get('/documents/:id/print/download', downloadPrintedDocument)
router.post('/documents/:id/thermal-ticket', generateBillingThermalTicket)
router.get('/imports', listBillingImports)
router.get('/imports/:id', getBillingFileImportById)
router.post('/imports/:id/retry', retryBillingImport)
router.get('/certificate/test', testCertificate)

export default router
