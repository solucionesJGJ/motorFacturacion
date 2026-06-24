import test from 'node:test'
import assert from 'node:assert/strict'
import { getIssuerConfig } from '../dist/config/issuer.config.js'

const issuerKeys = [
    'ISSUER_RUT',
    'ISSUER_RAZON_SOCIAL',
    'ISSUER_GIRO',
    'ISSUER_ACTECO',
    'ISSUER_DIRECCION',
    'ISSUER_COMUNA',
    'ISSUER_CIUDAD',
]

function snapshotEnv() {
    return Object.fromEntries(issuerKeys.map((key) => [key, process.env[key]]))
}

function restoreEnv(snapshot) {
    for (const key of issuerKeys) {
        if (snapshot[key] === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = snapshot[key]
        }
    }
}

test('reads issuer configuration from environment', () => {
    const previous = snapshotEnv()

    process.env.ISSUER_RUT = '76999888-8'
    process.env.ISSUER_RAZON_SOCIAL = 'EMISOR DEMO SPA'
    process.env.ISSUER_GIRO = 'SERVICIOS'
    process.env.ISSUER_ACTECO = '960909'
    process.env.ISSUER_DIRECCION = 'Av. Providencia 100'
    process.env.ISSUER_COMUNA = 'Providencia'
    process.env.ISSUER_CIUDAD = 'Santiago'

    const issuer = getIssuerConfig()

    restoreEnv(previous)

    assert.deepEqual(issuer, {
        rut: '76999888-8',
        razonSocial: 'EMISOR DEMO SPA',
        giro: 'SERVICIOS',
        acteco: '960909',
        direccion: 'Av. Providencia 100',
        comuna: 'Providencia',
        ciudad: 'Santiago',
    })
})

test('throws when a required issuer variable is missing', () => {
    const previous = snapshotEnv()

    for (const key of issuerKeys) {
        delete process.env[key]
    }

    assert.throws(() => getIssuerConfig(), /ISSUER_RUT no esta configurada/)

    restoreEnv(previous)
})
