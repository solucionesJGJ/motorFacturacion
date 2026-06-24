import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { processBillingFile } from '../dist/services/billing-import.service.js'
import {
    BillingDocument,
    BillingDocumentItem,
    BillingFileImport,
    sequelize,
} from '../dist/models/index.js'

const integrationPrefix = 'integration-import-'

test('imports a billing txt file into postgres', async (t) => {
    await sequelize.authenticate()

    async function cleanup() {
        const documents = await BillingDocument.findAll({
            where: {
                external_order_id: integrationPrefix,
            },
        })

        if (documents.length > 0) {
            await BillingDocumentItem.destroy({
                where: {
                    billing_document_id: documents.map((document) => document.id),
                },
            })
        }

        await BillingDocument.destroy({
            where: {
                external_order_id: integrationPrefix,
            },
        })

        await BillingFileImport.destroy({
            where: {
                filename: `${integrationPrefix}invoice.txt`,
            },
        })
    }

    await cleanup()

    t.after(async () => {
        await cleanup()
        await sequelize.close()
    })

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), integrationPrefix))
    const filePath = path.join(dir, `${integrationPrefix}invoice.txt`)

    await fs.writeFile(
        filePath,
        [
            'DOCUMENT_TYPE=33',
            'FOLIO=9001',
            'RECEIVER_RUT=76999888-8',
            'RECEIVER_NAME=CLIENTE INTEGRACION SPA',
            'RECEIVER_GIRO=SERVICIOS',
            'ITEM=Servicio base|1|10000',
            'ITEM=Adicional|2|5000',
        ].join('\n'),
        'utf-8',
    )

    const document = await processBillingFile(filePath, {
        externalOrderId: integrationPrefix,
    })

    assert.ok(document)
    assert.equal(document?.source_type, 'file')
    assert.equal(document?.source_filename, `${integrationPrefix}invoice.txt`)
    assert.equal(Number(document?.net_amount), 20000)
    assert.equal(Number(document?.tax_amount), 3800)
    assert.equal(Number(document?.total_amount), 23800)

    const persistedItems = await BillingDocumentItem.findAll({
        where: {
            billing_document_id: document.id,
        },
        order: [['line_number', 'ASC']],
    })

    assert.equal(persistedItems.length, 2)
    assert.equal(persistedItems[0]?.description, 'Servicio base')
    assert.equal(Number(persistedItems[1]?.quantity), 2)

    const fileImport = await BillingFileImport.findOne({
        where: {
            filename: `${integrationPrefix}invoice.txt`,
        },
    })

    assert.ok(fileImport)
    assert.equal(fileImport?.status, 'processed')
    assert.equal(fileImport?.error_message, null)
    assert.ok(fileImport?.processed_at)
})
