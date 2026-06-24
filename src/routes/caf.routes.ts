import { Router } from 'express'
import { apiKeyMiddleware } from '../middlewares/api-key.middleware.js'
import { createCaf, getCafs } from '../controllers/caf.controller.js'

const router = Router()

router.use(apiKeyMiddleware)

router.get('/', getCafs)
router.post('/', createCaf)

export default router