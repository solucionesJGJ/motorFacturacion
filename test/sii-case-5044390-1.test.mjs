import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeBillingInput } from '../dist/services/billing-normalizer.service.js'

test('SII 5044390-1 - calcula correctamente neto, IVA y total', () => {
    const input = {
        documentType: 33,

        receiver: {
            rut: '76.123.456-0',
            razonSocial: 'RECEPTOR PRUEBA SII',
            giro: 'SERVICIOS DE PRUEBA',
            address: 'DIRECCION PRUEBA 123',
            comuna: 'SANTIAGO',
            ciudad: 'SANTIAGO',
        },

        items: [
            {
                description: 'Cajón AFECTO',
                quantity: 134,
                unitPrice: 1540,
            },
            {
                description: 'Relleno AFECTO',
                quantity: 57,
                unitPrice: 2517,
            },
        ],
    }

    const result = normalizeBillingInput(input)

    // Línea 1
    assert.equal(result.items[0].netAmount, 206360)

    // Línea 2
    assert.equal(result.items[1].netAmount, 143469)

    // Totales oficiales del caso
    assert.equal(result.netAmount, 349829)
    assert.equal(result.taxAmount, 66468)
    assert.equal(result.totalAmount, 416297)

    // La distribución interna del IVA también debe cuadrar
    const itemsTaxAmount = result.items.reduce(
        (total, item) => total + item.taxAmount,
        0,
    )

    assert.equal(itemsTaxAmount, result.taxAmount)

    const itemsTotalAmount = result.items.reduce(
        (total, item) => total + item.totalAmount,
        0,
    )

    assert.equal(itemsTotalAmount, result.totalAmount)
})