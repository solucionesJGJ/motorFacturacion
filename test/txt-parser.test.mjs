import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseTxtInvoice } from '../dist/parsers/txt.parser.js'

test('parses txt invoices into billing input', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'billing-parser-'))
    const filePath = path.join(dir, 'invoice.txt')

    await fs.writeFile(
        filePath,
        [
            'DOCUMENT_TYPE=33',
            'FOLIO=1001',
            'RECEIVER_RUT=76999888-1',
            'RECEIVER_NAME=CLIENTE DEMO SPA',
            'ITEM=Servicio base|1|10000',
            'ITEM=Adicional|2|5000',
        ].join('\n'),
        'utf-8',
    )

    const parsed = await parseTxtInvoice(filePath)

    assert.equal(parsed.documentType, 33)
    assert.equal(parsed.folio, 1001)
    assert.equal(parsed.receiver.rut, '76999888-1')
    assert.equal(parsed.items.length, 2)
    assert.deepEqual(parsed.items[1], {
        description: 'Adicional',
        quantity: 2,
        unitPrice: 5000,
    })
})
