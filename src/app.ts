import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import billingRoutes from './routes/billing.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

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