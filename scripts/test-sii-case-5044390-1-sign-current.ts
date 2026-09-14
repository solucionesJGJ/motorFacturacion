import 'dotenv/config'

import fs from 'fs/promises'

import {
    signXmlFile,
} from '../src/services/xml-sign.service.js'

const XML_PATH =
    'output/xml/dte-33-4.xml'

async function main() {
    console.log('')
    console.log(
        'SII 5044390-1 - TEST FIRMA XML ACTUAL',
    )

    console.log(
        '────────────────────────────────',
    )

    console.log(
        `Archivo origen: ${XML_PATH}`,
    )

    const result =
        await signXmlFile(
            XML_PATH,
        )

    const xml =
        result.signedXml

    console.log('')
    console.log('ARCHIVO FIRMADO')
    console.log(
        '────────────────────────────────',
    )

    console.log(
        result.signedPath,
    )

    console.log('')
    console.log('XML')
    console.log(
        '────────────────────────────────',
    )

    console.log(xml)

    console.log('')
    console.log('DIAGNÓSTICO')
    console.log(
        '────────────────────────────────',
    )

    const documentoClose =
        xml.indexOf(
            '</Documento>',
        )

    const signatureStart =
        xml.indexOf(
            '<Signature',
        )

    if (
        signatureStart === -1
    ) {
        console.log(
            '✘ No se encontró Signature',
        )

        throw new Error(
            'XMLDSIG no generado',
        )
    }

    console.log(
        '✔ Signature presente',
    )

    console.log(
        `Posición </Documento>: ${documentoClose}`,
    )

    console.log(
        `Posición <Signature>: ${signatureStart}`,
    )

    if (
        signatureStart <
        documentoClose
    ) {
        console.log(
            '⚠ Signature quedó DENTRO de Documento',
        )
    } else {
        console.log(
            '✔ Signature quedó FUERA de Documento',
        )
    }

    const referenceMatch =
        xml.match(
            /<Reference[^>]*URI="([^"]*)"/,
        )

    console.log(
        `Reference URI: ${
            referenceMatch?.[1] ??
            'NO ENCONTRADA'
        }`,
    )

    const hasSha1Digest =
        xml.includes(
            'http://www.w3.org/2000/09/xmldsig#sha1',
        )

    console.log(
        hasSha1Digest
            ? '✔ Digest SHA1'
            : '✘ Digest SHA1 no encontrado',
    )

    const hasRsaSha1 =
        xml.includes(
            'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
        )

    console.log(
        hasRsaSha1
            ? '✔ Firma RSA-SHA1'
            : '✘ RSA-SHA1 no encontrada',
    )

    const hasCertificate =
        xml.includes(
            '<X509Certificate>',
        )

    console.log(
        hasCertificate
            ? '✔ X509Certificate incluido'
            : '✘ X509Certificate no encontrado',
    )

    console.log('')
    console.log(
        'Certificado:',
    )

    console.log(
        result.certificateInfo,
    )

    await fs.access(
        result.signedPath,
    )

    console.log('')
    console.log(
        '✔ Archivo firmado generado',
    )
}

main()
    .catch((error) => {
        console.error('')
        console.error(
            'ERROR TEST FIRMA:',
            error,
        )

        process.exitCode = 1
    })