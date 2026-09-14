import fs from 'fs/promises'
import forge from 'node-forge'

export type LoadedCertificate = {
    privateKeyPem: string
    certificatePem: string
    validFrom: Date
    validTo: Date
    subject: string
    issuer: string
    serialNumber: string
}

export async function loadPfxCertificate(): Promise<LoadedCertificate> {
    const pfxPath = process.env.SIGN_CERT_PFX_PATH
    const password = process.env.SIGN_CERT_PASSWORD

    if (!pfxPath || !password) {
        throw new Error(
            'SIGN_CERT_PFX_PATH y SIGN_CERT_PASSWORD son obligatorios',
        )
    }

    const pfxBuffer = await fs.readFile(pfxPath)

    const p12Asn1 = forge.asn1.fromDer(
        forge.util.createBuffer(pfxBuffer.toString('binary')),
    )

    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password)

    const keyBags = p12.getBags({
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    })[forge.pki.oids.pkcs8ShroudedKeyBag]

    const certBags = p12.getBags({
        bagType: forge.pki.oids.certBag,
    })[forge.pki.oids.certBag]

    const keyBag = keyBags?.[0]
    const certBag = certBags?.[0]

    if (!keyBag?.key) {
        throw new Error('No se encontró llave privada en el PFX')
    }

    if (!certBag?.cert) {
        throw new Error('No se encontró certificado en el PFX')
    }

    const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key)
    const certificatePem = forge.pki.certificateToPem(certBag.cert)

    const subject = certBag.cert.subject.attributes
        .map((attr) => `${attr.shortName || attr.name}=${attr.value}`)
        .join(', ')

    const issuer = certBag.cert.issuer.attributes
        .map((attr) => `${attr.shortName || attr.name}=${attr.value}`)
        .join(', ')

    return {
        privateKeyPem,
        certificatePem,
        validFrom: certBag.cert.validity.notBefore,
        validTo: certBag.cert.validity.notAfter,
        subject,
        issuer,
        serialNumber: certBag.cert.serialNumber,
    }
}
