import test from 'node:test'
import assert from 'node:assert/strict'
import {
    markJobError,
    markJobProcessed,
    markJobProcessing,
} from '../dist/services/billing-job.service.js'

function createFakeJob(attributes) {
    return {
        ...attributes,
        updates: [],
        async update(payload) {
            this.updates.push(payload)
            Object.assign(this, payload)
            return this
        },
    }
}

test('marks a job as processing and increments attempts', async () => {
    const job = createFakeJob({
        status: 'pending',
        attempts: 1,
        error_message: 'previous error',
    })

    await markJobProcessing(job)

    assert.equal(job.status, 'processing')
    assert.equal(job.attempts, 2)
    assert.equal(job.error_message, null)
})

test('marks a job as processed with processed_at timestamp', async () => {
    const job = createFakeJob({
        status: 'processing',
        processed_at: null,
        error_message: 'previous error',
    })

    await markJobProcessed(job)

    assert.equal(job.status, 'processed')
    assert.equal(job.error_message, null)
    assert.ok(job.processed_at instanceof Date)
})

test('returns jobs with remaining attempts to pending on error', async () => {
    const job = createFakeJob({
        status: 'processing',
        attempts: 2,
        error_message: null,
    })

    await markJobError(job, new Error('provider unavailable'))

    assert.equal(job.status, 'pending')
    assert.equal(job.error_message, 'provider unavailable')
})

test('fails jobs after the third attempt', async () => {
    const job = createFakeJob({
        status: 'processing',
        attempts: 3,
        error_message: null,
    })

    await markJobError(job, new Error('provider unavailable'))

    assert.equal(job.status, 'failed')
    assert.equal(job.error_message, 'provider unavailable')
})
