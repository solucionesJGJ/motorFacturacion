import fs from 'fs/promises'
import { SignedXml } from 'xml-crypto'

export async function signXmlFile(xmlPath: string) {
    const xml = await fs.readFile(xmlPath, 'utf-8')

    /**
     * Versión base.
     * xml-crypto trabaja mejor con PEM.
     * Más adelante convertiremos PFX → PEM.
     */
    const privateKeyPath = process.env.SIGN_PRIVATE_KEY_PATH
    const certificatePath = process.env.SIGN_CERTIFICATE_PATH

    if (!privateKeyPath || !certificatePath) {
        throw new Error(
            'SIGN_PRIVATE_KEY_PATH y SIGN_CERTIFICATE_PATH no están configurados',
        )
    }

    const privateKey = await fs.readFile(privateKeyPath, 'utf-8')
    const certificate = await fs.readFile(certificatePath, 'utf-8')

    const sig = new SignedXml()

    sig.privateKey = privateKey
    sig.publicCert = certificate

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
    }
}