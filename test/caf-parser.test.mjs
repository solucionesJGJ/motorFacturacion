import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCafXml } from '../dist/services/caf-parser.service.js'

const cafXml = `
<AUTORIZACION>
  <CAF version="1.0">
    <DA>
      <RE>76999888-8</RE>
      <RS>EMISOR DEMO SPA</RS>
      <TD>33</TD>
      <RNG>
        <D>1001</D>
        <H>2000</H>
      </RNG>
      <FA>2026-06-24</FA>
    </DA>
    <FRMA algoritmo="SHA1withRSA">signature-placeholder</FRMA>
  </CAF>
</AUTORIZACION>
`

test('parses CAF XML authorization data', () => {
    const parsed = parseCafXml(cafXml)

    assert.deepEqual(parsed, {
        rutEmisor: '76999888-8',
        razonSocial: 'EMISOR DEMO SPA',
        documentType: 33,
        folioFrom: 1001,
        folioTo: 2000,
        authorizationDate: '2026-06-24',
        privateKey: 'signature-placeholder',
    })
})

test('rejects XML without CAF authorization data', () => {
    assert.throws(
        () => parseCafXml('<root />'),
        /CAF invalido: no se encontro AUTORIZACION\.CAF\.DA/,
    )
})
