import fs from 'node:fs'
import path from 'node:path'
import forge from 'node-forge'
import 'dotenv/config'

const issuerRut = process.env.ISSUER_RUT
const issuerName = process.env.ISSUER_RAZON_SOCIAL

if (!issuerRut) {
    throw new Error(
        'Falta ISSUER_RUT en el archivo .env',
    )
}

if (!issuerName) {
    throw new Error(
        'Falta ISSUER_RAZON_SOCIAL en el archivo .env',
    )
}

console.log('Generando par RSA DEV...')

const keyPair = forge.pki.rsa.generateKeyPair({
    bits: 2048,
    workers: -1,
})

const privateKeyPem = forge.pki.privateKeyToPem(
    keyPair.privateKey,
)

const publicKeyPem = forge.pki.publicKeyToPem(
    keyPair.publicKey,
)

const now = new Date()

const authorizationDate = now
    .toISOString()
    .slice(0, 10)

/**
 * CAF completamente ficticio.
 *
 * IMPORTANTE:
 * - NO fue emitido por SII.
 * - NO sirve para emitir DTE.
 * - NO debe enviarse al SII.
 *
 * Sólo se utiliza para desarrollo automático.
 */
const cafXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<AUTORIZACION>
    <CAF version="1.0">
        <DA>
            <RE>${issuerRut}</RE>
            <RS>${issuerName}</RS>
            <TD>33</TD>

            <RNG>
                <D>1</D>
                <H>100</H>
            </RNG>

            <FA>${authorizationDate}</FA>

            <RSAPK>
                <M>DEV-MODULUS-NOT-SII</M>
                <E>AQAB</E>
            </RSAPK>

            <IDK>999</IDK>
        </DA>

        <FRMA algoritmo="SHA1withRSA">
            DEV-CERTIFICATE-NOT-SII
        </FRMA>
    </CAF>

    <RSASK><![CDATA[
${privateKeyPem}
    ]]></RSASK>

    <RSAPUBK><![CDATA[
${publicKeyPem}
    ]]></RSAPUBK>
</AUTORIZACION>
`

const outputDir = path.resolve(
    'dev',
    'caf',
)

fs.mkdirSync(outputDir, {
    recursive: true,
})

const outputFile = path.join(
    outputDir,
    'CAF-DEV-DTE33-1-100.xml',
)

fs.writeFileSync(
    outputFile,
    cafXml,
    'utf8',
)

console.log('')
console.log('CAF DEV generado correctamente')
console.log('')
console.log(`Emisor: ${issuerRut}`)
console.log(`Tipo DTE: 33`)
console.log(`Folios: 1 - 100`)
console.log('')
console.log(`Archivo: ${outputFile}`)
console.log('')
console.log('⚠ CAF DE DESARROLLO')
console.log('⚠ NO ENVIAR AL SII')