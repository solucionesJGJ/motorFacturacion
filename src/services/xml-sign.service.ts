import fs from 'fs/promises'
import { SignedXml } from 'xml-crypto'
import { loadPfxCertificate } from './certificate.service.js'

export async function signXmlFile(xmlPath: string) {
    const xml = await fs.readFile(xmlPath, 'utf-8')

    const certificate = await loadPfxCertificate()

    if (certificate.validTo < new Date()) {
        throw new Error('El certificado digital está vencido')
    }

    const sig = new SignedXml()

    sig.privateKey = certificate.privateKeyPem
    sig.publicCert = certificate.certificatePem

    sig.addReference({
        xpath: "//*[local-name(.)='Documento']",
        transforms: [
            'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
        ],
        digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    })

    sig.canonicalizationAlgorithm =
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'

    sig.signatureAlgorithm =
        'http://www.w3.org/2000/09/xmldsig#rsa-sha1'

    sig.computeSignature(xml, {
        location: {
            reference: "//*[local-name(.)='Documento']",
            action: 'append',
        },
    })

    const signedXml = sig.getSignedXml()
    const signedPath = xmlPath.replace('.xml', '-signed.xml')

    await fs.writeFile(signedPath, signedXml, 'utf-8')

    return {
        signedXml,
        signedPath,
        certificateInfo: {
            validFrom: certificate.validFrom,
            validTo: certificate.validTo,
            subject: certificate.subject,
            issuer: certificate.issuer,
            serialNumber: certificate.serialNumber,
        },
    }
}