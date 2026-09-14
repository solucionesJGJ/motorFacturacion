import fs from 'fs/promises'
import forge from 'node-forge'
import { SignedXml } from 'xml-crypto'

import { loadPfxCertificate } from './certificate.service.js'

function getRsaKeyInfoContent(certificatePem: string) {
    const cert = forge.pki.certificateFromPem(certificatePem)

    const publicKey = cert.publicKey as forge.pki.rsa.PublicKey

    if (!publicKey?.n || !publicKey?.e) {
        throw new Error(
            'El certificado no contiene una llave pública RSA válida',
        )
    }

    let modulusHex = publicKey.n.toString(16)

    if (modulusHex.length % 2 !== 0) {
        modulusHex = `0${modulusHex}`
    }

    const modulus = Buffer.from(modulusHex, 'hex').toString('base64')

    let exponentHex = publicKey.e.toString(16)

    if (exponentHex.length % 2 !== 0) {
        exponentHex = `0${exponentHex}`
    }

    const exponent = Buffer.from(exponentHex, 'hex').toString('base64')

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

function getSetDteId(xml: string) {
    const match = xml.match(/<SetDTE\b[^>]*\bID="([^"]+)"/)

    if (!match) {
        throw new Error('EnvioDTE no contiene SetDTE con atributo ID')
    }

    return match[1]
}

export async function signEnvioDteFile(xmlPath: string) {
    /**
     * El archivo fue escrito realmente
     * como ISO-8859-1.
     */
    const buffer = await fs.readFile(xmlPath)

    const xml = buffer.toString('latin1')

    if (!xml.includes('<EnvioDTE')) {
        throw new Error('El archivo no contiene EnvioDTE')
    }

    const setDteId = getSetDteId(xml)

    const certificate = await loadPfxCertificate()

    const now = new Date()

    if (certificate.validFrom > now) {
        throw new Error('El certificado digital todavía no es válido')
    }

    if (certificate.validTo < now) {
        throw new Error('El certificado digital está vencido')
    }

    const sig = new SignedXml()

    sig.privateKey = certificate.privateKeyPem

    sig.publicCert = certificate.certificatePem

    /**
     * Igual que en la firma individual:
     * SII requiere KeyValue + X509Data.
     */
    sig.getKeyInfoContent = () =>
        getRsaKeyInfoContent(certificate.certificatePem)

    /**
     * Esta vez NO firmamos Documento.
     *
     * La referencia corresponde a SetDTE.
     */
    sig.addReference({
        xpath: "//*[local-name(.)='SetDTE']",

        transforms: ['http://www.w3.org/TR/2001/REC-xml-c14n-20010315'],

        digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    })

    sig.canonicalizationAlgorithm =
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'

    sig.signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'

    /**
     * Signature queda como hijo de EnvioDTE,
     * después de SetDTE.
     */
    sig.computeSignature(xml, {
        location: {
            reference: "//*[local-name(.)='EnvioDTE']",

            action: 'append',
        },
    })

    const signedXml = sig.getSignedXml()

    const expectedReference = `URI="#${setDteId}"`

    if (!signedXml.includes(expectedReference)) {
        throw new Error(`La firma del envío no referencia ${setDteId}`)
    }

    /**
     * En el sobre tendremos DOS Signature:
     *
     * 1. firma interna del DTE
     * 2. firma del SetDTE
     */
    const signatureCount = (signedXml.match(/<Signature\b/g) || []).length

    if (signatureCount !== 2) {
        throw new Error(
            `Se esperaban 2 firmas XMLDSIG y se encontraron ${signatureCount}`,
        )
    }

    const setDteClose = signedXml.lastIndexOf('</SetDTE>')

    const envioClose = signedXml.lastIndexOf('</EnvioDTE>')

    /**
     * Buscamos la ÚLTIMA Signature.
     * La primera pertenece al DTE.
     */
    const envioSignatureStart = signedXml.lastIndexOf('<Signature')

    if (setDteClose === -1 || envioSignatureStart === -1 || envioClose === -1) {
        throw new Error(
            'No fue posible validar la estructura del EnvioDTE firmado',
        )
    }

    if (envioSignatureStart < setDteClose) {
        throw new Error('La firma del envío quedó dentro de SetDTE')
    }

    if (envioSignatureStart > envioClose) {
        throw new Error('La firma quedó fuera de EnvioDTE')
    }

    const signedPath = xmlPath.replace(/\.xml$/i, '-signed.xml')

    /**
     * Conservamos físicamente ISO-8859-1.
     */
    await fs.writeFile(signedPath, Buffer.from(signedXml, 'latin1'))

    return {
        signedXml,
        signedPath,

        signatureInfo: {
            setDteId,
            reference: `#${setDteId}`,
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
