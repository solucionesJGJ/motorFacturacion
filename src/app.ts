import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import billingRoutes from './routes/billing.routes.js'
import webhookRoutes from './routes/webhook.routes.js'
import mockLavaYaRoutes from './routes/mock-lava-ya.routes.js'
import auditRoutes from './routes/audit.routes.js'
import cafRoutes from './routes/caf.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/webhooks', webhookRoutes)

app.use('/mock/lava-ya', mockLavaYaRoutes)

app.use('/api/audit', auditRoutes)

app.use('/api/cafs', cafRoutes)

app.get('/health', (_req, res) => {
    res.json({
        ok: true,
        service: 'billing-engine',
    })
})

app.use('/api/billing', billingRoutes)

const port = process.env.PORT || 4000

app.listen(port, () => {
    console.log(`Billing engine running on port ${port}`)
})