import { Router } from 'express'

const router = Router()

router.get('/payments/:id', (req, res) => {
    const { id } = req.params

    return res.json({
        id,
        order_id: `order-${id}`,
        amount: 15000,
        method: 'card',
        status: 'paid',
        paid_at: new Date().toISOString(),
    })
})

router.get('/orders/:id', (req, res) => {
    const { id } = req.params

    return res.json({
        id,
        customer: {
            rut: '11111111-1',
            name: 'CLIENTE DEMO SPA',
            giro: 'SERVICIOS',
            address: 'Av. Providencia 100',
            comuna: 'Providencia',
            ciudad: 'Santiago',
            email: 'demo@cliente.cl',
        },
        items: [
            {
                id: 'item-1',
                name: 'Servicio lavandería',
                quantity: 1,
                unit_price: 10000,
                total: 10000,
            },
            {
                id: 'item-2',
                name: 'Servicio adicional',
                quantity: 1,
                unit_price: 5000,
                total: 5000,
            },
        ],
    })
})

export default router