import fs from 'fs/promises'
import { SignedXml } from 'xml-crypto'
import forge from 'node-forge'

import { loadPfxCertificate } from './certificate.service.js'

function getRsaKeyInfoContent(certificatePem: string) {
    const cert = forge.pki.certificateFromPem(certificatePem)

    const publicKey = cert.publicKey as forge.pki.rsa.PublicKey

    if (!publicKey?.n || !publicKey?.e) {
        throw new Error(
            'El certificado no contiene una llave pública RSA válida',
        )
    }

    /**
     * XMLDSIG requiere:
     *
     * Modulus = entero RSA unsigned big-endian
     * codificado Base64.
     */
    let modulusHex = publicKey.n.toString(16)

    if (modulusHex.length % 2 !== 0) {
        modulusHex = `0${modulusHex}`
    }

    const modulus = Buffer.from(modulusHex, 'hex').toString('base64')

    /**
     * Exponente público RSA.
     *
     * Lo habitual es 65537:
     *
     * 0x010001
     * → AQAB
     */
    let exponentHex = publicKey.e.toString(16)

    if (exponentHex.length % 2 !== 0) {
        exponentHex = `0${exponentHex}`
    }

    const exponent = Buffer.from(exponentHex, 'hex').toString('base64')

    /**
     * Certificado DER en Base64.
     */
    const certificateBase64 = certificatePem
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s+/g, '')

    return [
        '<KeyValue>',
        '<RSAKeyValue>',
        `<Modulus>${modulus}</Modulus>`,
        `<Exponent>${exponent}</Exponent>`,
        '</RSAKeyValue>',
        '</KeyValue>',
        '<X509Data>',
        `<X509Certificate>${certificateBase64}</X509Certificate>`,
        '</X509Data>',
    ].join('')
}

export async function signXmlFile(xmlPath: string) {
    const xml = await fs.readFile(xmlPath, 'utf-8')

    const certificate = await loadPfxCertificate()

    const now = new Date()

    if (certificate.validFrom > now) {
        throw new Error('El certificado digital todavía no es válido')
    }

    if (certificate.validTo < now) {
        throw new Error('El certificado digital está vencido')
    }

    const documentIdMatch = xml.match(/<Documento\b[^>]*\bID="([^"]+)"/)

    if (!documentIdMatch) {
        throw new Error('El DTE no contiene Documento con atributo ID')
    }

    const documentId = documentIdMatch[1]

    const sig = new SignedXml()

    sig.privateKey = certificate.privateKeyPem

    sig.publicCert = certificate.certificatePem

    /**
     * xml-crypto 6.x permite reemplazar
     * el contenido de KeyInfo.
     *
     * SII requiere:
     *
     * KeyValue
     *   RSAKeyValue
     *     Modulus
     *     Exponent
     *
     * X509Data
     *   X509Certificate
     */
    sig.getKeyInfoContent = () =>
        getRsaKeyInfoContent(certificate.certificatePem)

    sig.addReference({
        xpath: "//*[local-name(.)='Documento']",

        transforms: ['http://www.w3.org/TR/2001/REC-xml-c14n-20010315'],

        digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    })

    sig.canonicalizationAlgorithm =
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'

    sig.signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'

    sig.computeSignature(xml, {
        location: {
            reference: "//*[local-name(.)='DTE']",

            action: 'append',
        },
    })

    const signedXml = sig.getSignedXml()

    const signatureCount = (signedXml.match(/<Signature\b/g) || []).length

    if (signatureCount !== 1) {
        throw new Error(
            `XML firmado inválido: se encontraron ${signatureCount} nodos Signature`,
        )
    }

    const documentClose = signedXml.indexOf('</Documento>')

    const signatureStart = signedXml.indexOf('<Signature')

    const dteClose = signedXml.lastIndexOf('</DTE>')

    if (documentClose === -1 || signatureStart === -1 || dteClose === -1) {
        throw new Error('No fue posible validar la estructura del DTE firmado')
    }

    if (signatureStart < documentClose) {
        throw new Error('Signature quedó incorrectamente dentro de Documento')
    }

    if (signatureStart > dteClose) {
        throw new Error('Signature quedó fuera de DTE')
    }

    const expectedReference = `URI="#${documentId}"`

    if (!signedXml.includes(expectedReference)) {
        throw new Error(
            `La firma no referencia correctamente al Documento ${documentId}`,
        )
    }

    /**
     * Validamos también estructura mínima
     * que exige SII dentro de KeyInfo.
     */
    if (!signedXml.includes('<KeyValue>')) {
        throw new Error('La firma no contiene KeyValue')
    }

    if (!signedXml.includes('<RSAKeyValue>')) {
        throw new Error('La firma no contiene RSAKeyValue')
    }

    if (!signedXml.includes('<Modulus>')) {
        throw new Error('La firma no contiene Modulus')
    }

    if (!signedXml.includes('<Exponent>')) {
        throw new Error('La firma no contiene Exponent')
    }

    if (!signedXml.includes('<X509Certificate>')) {
        throw new Error('La firma no contiene X509Certificate')
    }

    const signedPath = xmlPath.replace(/\.xml$/i, '-signed.xml')

    await fs.writeFile(signedPath, signedXml, 'utf-8')

    return {
        signedXml,
        signedPath,

        signatureInfo: {
            documentId,
            reference: `#${documentId}`,
            signatureCount,
        },

        certificateInfo: {
            validFrom: certificate.validFrom,

            validTo: certificate.validTo,

            subject: certificate.subject,

            issuer: certificate.issuer,

            serialNumber: certificate.serialNumber,
        },
    }
}
