import test from 'node:test'
import assert from 'node:assert/strict'
import { mapLavaYaToBillingInput } from '../dist/services/providers/lava-ya/lava-ya.mapper.js'

test('maps Lava Ya payment/order data to billing input', () => {
    const billingInput = mapLavaYaToBillingInput({
        payment: {
            id: 'pay-1',
            order_id: 'order-1',
            amount: 15000,
            method: 'card',
            status: 'paid',
            paid_at: '2026-06-19T10:00:00.000Z',
        },
        order: {
            id: 'order-1',
            customer: {
                rut: '76999888-8',
                name: 'CLIENTE LAVA YA SPA',
                giro: 'SERVICIOS',
                address: 'Av. Providencia 100',
                comuna: 'Providencia',
                ciudad: 'Santiago',
                email: 'cliente@example.com',
            },
            items: [
                {
                    id: 'item-1',
                    name: 'Servicio base',
                    quantity: 2,
                    unit_price: 7500,
                    total: 15000,
                },
            ],
        },
    })

    assert.equal(billingInput.documentType, 33)
    assert.equal(billingInput.receiver.rut, '76999888-8')
    assert.equal(billingInput.receiver.razonSocial, 'CLIENTE LAVA YA SPA')
    assert.equal(billingInput.receiver.comuna, 'Providencia')
    assert.deepEqual(billingInput.items, [
        {
            description: 'Servicio base',
            quantity: 2,
            unitPrice: 7500,
        },
    ])
})

test('uses default giro when Lava Ya customer has no giro', () => {
    const billingInput = mapLavaYaToBillingInput({
        payment: {
            id: 'pay-2',
            order_id: 'order-2',
            amount: 10000,
            method: 'cash',
            status: 'paid',
            paid_at: '2026-06-19T10:00:00.000Z',
        },
        order: {
            id: 'order-2',
            customer: {
                rut: '76999888-8',
                name: 'CLIENTE SIN GIRO',
            },
            items: [],
        },
    })

    assert.equal(billingInput.receiver.giro, 'SERVICIOS')
})
