import { Router } from 'express'
import { apiKeyMiddleware } from '../middlewares/api-key.middleware.js'
import {
    checkSiiSubmissionStatus,
    createSiiSubmission,
    generateSiiEnvelope,
    getSiiSubmission,
    getSiiSubmissions,
    getSiiSubmissionStatus,
    sendSiiSubmission,
    signSiiEnvelope,
} from '../controllers/sii-submission.controller.js'

const router = Router()

router.use(apiKeyMiddleware)

router.post('/submissions', createSiiSubmission)
router.get('/submissions', getSiiSubmissions)
router.get('/submissions/:id', getSiiSubmission)
router.get('/submissions/:id/status', getSiiSubmissionStatus)
router.post('/submissions/:id/generate-envelope', generateSiiEnvelope)
router.post('/submissions/:id/sign-envelope', signSiiEnvelope)
router.post('/submissions/:id/send', sendSiiSubmission)
router.post('/submissions/:id/check-status', checkSiiSubmissionStatus)

export default router
