import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeBillingInput } from '../dist/services/billing-normalizer.service.js'

test('normalizes billing amounts and receiver fields', () => {
    const normalized = normalizeBillingInput({
        documentType: 33,
        receiver: {
            rut: '76999888-1',
            razonSocial: ' CLIENTE DEMO SPA ',
            giro: ' Servicios ',
        },
        items: [
            {
                description: ' Servicio base ',
                quantity: 2,
                unitPrice: 10000,
            },
            {
                description: 'Adicional',
                quantity: 1,
                unitPrice: 5000,
            },
        ],
    })

    assert.equal(normalized.receiverRut, '76.999.888-1')
    assert.equal(normalized.receiverName, 'CLIENTE DEMO SPA')
    assert.equal(normalized.receiverGiro, 'Servicios')
    assert.equal(normalized.netAmount, 25000)
    assert.equal(normalized.taxAmount, 4750)
    assert.equal(normalized.totalAmount, 29750)
    assert.deepEqual(
        normalized.items.map((item) => item.lineNumber),
        [1, 2],
    )
})
