import test from 'node:test'
import assert from 'node:assert/strict'
import { apiKeyMiddleware } from '../dist/middlewares/api-key.middleware.js'

function createResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code
            return this
        },
        json(payload) {
            this.body = payload
            return this
        },
    }
}

function restoreEnv(name, value) {
    if (value === undefined) {
        delete process.env[name]
        return
    }

    process.env[name] = value
}

test('accepts x-api-key header when it matches BILLING_API_KEY', () => {
    const previous = process.env.BILLING_API_KEY
    process.env.BILLING_API_KEY = 'secret-key'

    const req = {
        headers: {
            'x-api-key': 'secret-key',
        },
    }
    const res = createResponse()
    let nextCalled = false

    apiKeyMiddleware(req, res, () => {
        nextCalled = true
    })

    restoreEnv('BILLING_API_KEY', previous)

    assert.equal(nextCalled, true)
    assert.equal(res.body, null)
})

test('accepts bearer authorization header', () => {
    const previous = process.env.BILLING_API_KEY
    process.env.BILLING_API_KEY = 'secret-key'

    const req = {
        headers: {
            authorization: 'Bearer secret-key',
        },
    }
    const res = createResponse()
    let nextCalled = false

    apiKeyMiddleware(req, res, () => {
        nextCalled = true
    })

    restoreEnv('BILLING_API_KEY', previous)

    assert.equal(nextCalled, true)
})

test('rejects missing or invalid API keys', () => {
    const previous = process.env.BILLING_API_KEY
    process.env.BILLING_API_KEY = 'secret-key'

    const req = {
        headers: {},
    }
    const res = createResponse()
    let nextCalled = false

    apiKeyMiddleware(req, res, () => {
        nextCalled = true
    })

    restoreEnv('BILLING_API_KEY', previous)

    assert.equal(nextCalled, false)
    assert.equal(res.statusCode, 401)
    assert.equal(res.body.ok, false)
})

test('fails closed when BILLING_API_KEY is not configured', () => {
    const previous = process.env.BILLING_API_KEY
    delete process.env.BILLING_API_KEY

    const req = {
        headers: {
            'x-api-key': 'any-key',
        },
    }
    const res = createResponse()
    let nextCalled = false

    apiKeyMiddleware(req, res, () => {
        nextCalled = true
    })

    restoreEnv('BILLING_API_KEY', previous)

    assert.equal(nextCalled, false)
    assert.equal(res.statusCode, 500)
    assert.equal(res.body.ok, false)
})
