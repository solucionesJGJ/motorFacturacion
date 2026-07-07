import test from 'node:test'
import assert from 'node:assert/strict'
import { SiiClient } from '../dist/services/sii/sii-client.js'

function restoreEnv(name, value) {
    if (value === undefined) {
        delete process.env[name]
        return
    }

    process.env[name] = value
}

test('SII mock upload returns a simulated TrackID', async () => {
    const previousMode = process.env.SII_MODE
    process.env.SII_MODE = 'mock'

    const client = new SiiClient()
    const result = await client.uploadEnvelope('output/envios/envio-demo-signed.xml')

    restoreEnv('SII_MODE', previousMode)

    assert.match(result.trackId, /^MOCK-/)
    assert.equal(result.rawResponse.received, true)
})

test('SII mock status maps TrackID variants to normalized statuses', async () => {
    const previousMode = process.env.SII_MODE
    process.env.SII_MODE = 'mock'

    const client = new SiiClient()

    const accepted = await client.getSubmissionStatus('MOCK-1')
    const processing = await client.getSubmissionStatus('MOCK-PENDING-1')
    const rejected = await client.getSubmissionStatus('MOCK-REJECT-1')

    restoreEnv('SII_MODE', previousMode)

    assert.equal(accepted.status, 'accepted')
    assert.equal(processing.status, 'processing')
    assert.equal(rejected.status, 'rejected')
    assert.equal(rejected.errorMessage, 'Envio rechazado en modo mock')
})

test('SII real mode fails explicitly while real integration is pending', async () => {
    const previousMode = process.env.SII_MODE
    process.env.SII_MODE = 'real'

    const client = new SiiClient()

    await assert.rejects(
        () => client.uploadEnvelope('output/envios/envio-demo-signed.xml'),
        /SII real mode not configured/,
    )

    restoreEnv('SII_MODE', previousMode)
})
