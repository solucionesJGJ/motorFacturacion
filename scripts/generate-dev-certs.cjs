require('dotenv').config({ quiet: true })

const fs = require('fs')
const path = require('path')
const forge = require('node-forge')

function clean(value) {
    const text = String(value || '').trim()

    if (
        (text.startsWith('"') && text.endsWith('"')) ||
        (text.startsWith("'") && text.endsWith("'"))
    ) {
        return text.slice(1, -1)
    }

    return text
}

const privateKeyPath = path.resolve(
    clean(process.env.SIGN_PRIVATE_KEY_PATH || 'certs/private-key.pem'),
)
const certificatePath = path.resolve(
    clean(process.env.SIGN_CERTIFICATE_PATH || 'certs/certificate.pem'),
)
const pfxPath = path.resolve(
    clean(
        process.env.SIGN_CERT_PFX_PATH ||
            process.env.SIGN_CERT_PATH ||
            'certs/certificado.pfx',
    ),
)
const password = clean(process.env.SIGN_CERT_PASSWORD || 'dev-password')

for (const dir of new Set([
    path.dirname(privateKeyPath),
    path.dirname(certificatePath),
    path.dirname(pfxPath),
])) {
    fs.mkdirSync(dir, { recursive: true })
}

const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 })
const cert = forge.pki.createCertificate()

cert.publicKey = keys.publicKey
cert.serialNumber = String(Date.now())
cert.validity.notBefore = new Date()
cert.validity.notAfter = new Date()
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2)

const attrs = [
    { name: 'commonName', value: 'Motor Facturacion Dev Certificate' },
    { name: 'countryName', value: 'CL' },
    { shortName: 'ST', value: 'Santiago' },
    { name: 'localityName', value: 'Santiago' },
    { name: 'organizationName', value: 'Motor Facturacion Dev' },
    { shortName: 'OU', value: 'Development' },
]

cert.setSubject(attrs)
cert.setIssuer(attrs)
cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', clientAuth: true, emailProtection: true },
    { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }] },
])
cert.sign(keys.privateKey, forge.md.sha256.create())

fs.writeFileSync(privateKeyPath, forge.pki.privateKeyToPem(keys.privateKey), 'utf8')
fs.writeFileSync(certificatePath, forge.pki.certificateToPem(cert), 'utf8')

const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: '3des',
})
const der = forge.asn1.toDer(p12Asn1).getBytes()

fs.writeFileSync(pfxPath, Buffer.from(der, 'binary'))

console.log(
    JSON.stringify({
        created: [
            path.relative(process.cwd(), privateKeyPath),
            path.relative(process.cwd(), certificatePath),
            path.relative(process.cwd(), pfxPath),
        ],
    }),
)
