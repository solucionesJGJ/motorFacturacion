import test from 'node:test'
import assert from 'node:assert/strict'
import { validateBillingInput } from '../dist/services/billing-validator.service.js'

const validPayload = {
    documentType: 33,
    folio: 1001,
    receiver: {
        rut: '76.999.888-8',
        razonSocial: 'CLIENTE DEMO SPA',
    },
    items: [
        {
            description: 'Servicio lavanderia',
            quantity: 1,
            unitPrice: 10000,
        },
    ],
}

test('accepts a complete billing payload', () => {
    const result = validateBillingInput(validPayload)

    assert.equal(result.valid, true)
    assert.deepEqual(result.errors, [])
})

test('rejects malformed payloads before normalization', () => {
    const result = validateBillingInput({
        documentType: '33',
        receiver: {
            rut: '11111111-2',
            razonSocial: '',
        },
        items: [
            {
                description: '',
                quantity: Number.NaN,
                unitPrice: -1,
            },
        ],
    })

    assert.equal(result.valid, false)
    assert.match(result.errors.join(' | '), /documentType/)
    assert.match(result.errors.join(' | '), /receiver\.rut/)
    assert.match(result.errors.join(' | '), /quantity/)
    assert.match(result.errors.join(' | '), /unitPrice/)
})
