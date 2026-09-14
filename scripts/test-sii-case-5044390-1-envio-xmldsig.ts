import 'dotenv/config'
import fs from 'fs/promises'

import {
    SignedXml,
} from 'xml-crypto'

const XML_PATH =
    'output/envios/envio-sii-5044390-1-test-signed.xml'

function extractSignatures(
    xml: string,
) {
    return [
        ...xml.matchAll(
            /<Signature\b[\s\S]*?<\/Signature>/g,
        ),
    ].map(
        match => match[0],
    )
}

function extractValue(
    xml: string,
    tagName: string,
) {
    const regex =
        new RegExp(
            `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
        )

    const match =
        xml.match(
            regex,
        )

    return match
        ? match[1].trim()
        : null
}

function extractReferenceUri(
    signatureXml: string,
) {
    const match =
        signatureXml.match(
            /<Reference\b[^>]*URI="([^"]+)"/,
        )

    return match
        ? match[1]
        : null
}

function buildCertificatePem(
    certificateBase64: string,
) {
    const lines =
        certificateBase64
            .replace(/\s+/g, '')
            .match(/.{1,64}/g)

    if (!lines) {
        throw new Error(
            'No fue posible construir PEM desde X509Certificate',
        )
    }

    return [
        '-----BEGIN CERTIFICATE-----',
        ...lines,
        '-----END CERTIFICATE-----',
    ].join('\n')
}

async function main() {
    console.log()
    console.log(
        'SII 5044390-1 - VERIFY ENVIO XMLDSIG',
    )

    console.log(
        '────────────────────────────────',
    )

    const buffer =
        await fs.readFile(
            XML_PATH,
        )

    const xml =
        buffer.toString(
            'latin1',
        )

    const signatures =
        extractSignatures(
            xml,
        )

    console.log(
        `Archivo: ${XML_PATH}`,
    )

    console.log(
        `Firmas encontradas: ${signatures.length}`,
    )

    if (
        signatures.length !== 2
    ) {
        throw new Error(
            `Se esperaban 2 firmas y se encontraron ${signatures.length}`,
        )
    }

    /**
     * La primera firma pertenece al DTE.
     * La última corresponde al SetDTE.
     */
    const envioSignature =
        signatures[
        signatures.length - 1
        ]

    const referenceUri =
        extractReferenceUri(
            envioSignature,
        )

    const digestValue =
        extractValue(
            envioSignature,
            'DigestValue',
        )

    const signatureValue =
        extractValue(
            envioSignature,
            'SignatureValue',
        )

    const certificateBase64 =
        extractValue(
            envioSignature,
            'X509Certificate',
        )

    if (!certificateBase64) {
        throw new Error(
            'La firma del envío no contiene X509Certificate',
        )
    }

    const certificatePem =
        buildCertificatePem(
            certificateBase64,
        )

    const verifier =
        new SignedXml()

    verifier.publicCert =
        certificatePem

    verifier.loadSignature(
        envioSignature,
    )

    const valid =
        verifier.checkSignature(
            xml,
        )

    console.log(
        `Reference URI: ${referenceUri}`,
    )

    console.log(
        `DigestValue: ${digestValue}`,
    )

    console.log(
        `SignatureValue bytes: ${signatureValue
            ? Buffer.from(
                signatureValue,
                'base64',
            ).length
            : 0
        }`,
    )

    console.log()

    console.log(
        'VALIDACIONES',
    )

    console.log(
        '────────────────────────────────',
    )

    const expectedReference =
        '#SetDTE-sii-5044390-1-test'

    if (
        referenceUri !==
        expectedReference
    ) {
        throw new Error(
            `Reference incorrecta. Esperada ${expectedReference}, obtenida ${referenceUri}`,
        )
    }

    console.log(
        '✔ Reference apunta al SetDTE',
    )

    if (!digestValue) {
        throw new Error(
            'DigestValue ausente',
        )
    }

    console.log(
        '✔ DigestValue presente',
    )

    if (!signatureValue) {
        throw new Error(
            'SignatureValue ausente',
        )
    }

    console.log(
        '✔ SignatureValue presente',
    )

    console.log(
        `Verificación XMLDSIG: ${valid}`,
    )

    if (!valid) {
        console.error()
        console.error(
            verifier.validationErrors,
        )

        throw new Error(
            'La firma XMLDSIG del SetDTE no es válida',
        )
    }

    console.log()
    console.log(
        '✔ Digest del SetDTE validado',
    )

    console.log(
        '✔ SignatureValue validado con certificado X509',
    )

    console.log(
        '✔ El SetDTE no fue alterado después de firmarlo',
    )

    console.log()
    console.log(
        '✔ XMLDSIG del EnvioDTE verificado criptográficamente',
    )
}

main().catch(
    (error) => {
        console.error()
        console.error(
            'ERROR',
        )

        console.error(
            error,
        )

        process.exit(1)
    },
)