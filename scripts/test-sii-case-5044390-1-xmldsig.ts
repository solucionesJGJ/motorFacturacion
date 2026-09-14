import 'dotenv/config'

import fs from 'fs/promises'
import { SignedXml } from 'xml-crypto'

const SIGNED_XML_PATH =
    'output/xml/dte-33-4-signed.xml'

function extractSignatureXml(
    xml: string,
) {
    const match =
        xml.match(
            /<Signature\b[\s\S]*?<\/Signature>/,
        )

    if (!match) {
        throw new Error(
            'No se encontró nodo Signature',
        )
    }

    return match[0]
}

function extractCertificate(
    xml: string,
) {
    const match =
        xml.match(
            /<X509Certificate>([\s\S]*?)<\/X509Certificate>/,
        )

    if (!match) {
        throw new Error(
            'No se encontró X509Certificate',
        )
    }

    const base64 =
        match[1]
            .replace(/\s+/g, '')
            .trim()

    return [
        '-----BEGIN CERTIFICATE-----',
        base64.match(/.{1,64}/g)?.join('\n') || base64,
        '-----END CERTIFICATE-----',
    ].join('\n')
}

function extractReferenceUri(
    xml: string,
) {
    const match =
        xml.match(
            /<Reference\b[^>]*URI="([^"]+)"/,
        )

    return match?.[1] ?? null
}

function extractDigestValue(
    xml: string,
) {
    const match =
        xml.match(
            /<DigestValue>([^<]+)<\/DigestValue>/,
        )

    return match?.[1]?.trim() ?? null
}

function extractSignatureValue(
    xml: string,
) {
    const match =
        xml.match(
            /<SignatureValue>([\s\S]*?)<\/SignatureValue>/,
        )

    return (
        match?.[1]
            ?.replace(/\s+/g, '')
            .trim() ??
        null
    )
}

async function main() {
    console.log('')
    console.log(
        'SII 5044390-1 - VERIFY XMLDSIG',
    )
    console.log(
        '────────────────────────────────',
    )

    const xml =
        await fs.readFile(
            SIGNED_XML_PATH,
            'utf-8',
        )

    const signatureXml =
        extractSignatureXml(
            xml,
        )

    const certificatePem =
        extractCertificate(
            xml,
        )

    const referenceUri =
        extractReferenceUri(
            signatureXml,
        )

    const digestValue =
        extractDigestValue(
            signatureXml,
        )

    const signatureValue =
        extractSignatureValue(
            signatureXml,
        )

    console.log(
        `Archivo: ${SIGNED_XML_PATH}`,
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

    /**
     * Verificador independiente.
     *
     * No usamos la llave privada.
     * Solo el certificado público
     * contenido en el propio XML.
     */
    const verifier =
        new SignedXml()

    verifier.publicCert =
        certificatePem

    verifier.loadSignature(
        signatureXml,
    )

    const valid =
        verifier.checkSignature(
            xml,
        )

    console.log('')
    console.log('VALIDACIONES')
    console.log(
        '────────────────────────────────',
    )

    if (
        referenceUri ===
        '#F33T4'
    ) {
        console.log(
            '✔ Reference apunta a #F33T4',
        )
    } else {
        console.log(
            `✘ Reference inesperada: ${referenceUri}`,
        )
    }

    if (
        digestValue
    ) {
        console.log(
            '✔ DigestValue presente',
        )
    } else {
        console.log(
            '✘ DigestValue ausente',
        )
    }

    if (
        signatureValue
    ) {
        console.log(
            '✔ SignatureValue presente',
        )
    } else {
        console.log(
            '✘ SignatureValue ausente',
        )
    }

    console.log(
        `Verificación XMLDSIG: ${valid}`,
    )

    if (!valid) {
        const verifierAny =
            verifier as any

        if (
            verifierAny.validationErrors
        ) {
            console.log('')
            console.log(
                'Errores de validación:',
            )

            console.log(
                verifierAny.validationErrors,
            )
        }

        throw new Error(
            'La firma XMLDSIG no pudo verificarse',
        )
    }

    console.log('')
    console.log(
        '✔ Digest del Documento validado',
    )

    console.log(
        '✔ SignatureValue validado con el certificado X509',
    )

    console.log(
        '✔ El XML firmado no fue alterado después de generar la firma',
    )

    console.log('')
    console.log(
        '✔ XMLDSIG verificado criptográficamente',
    )
}

main()
    .catch((error) => {
        console.error('')
        console.error(
            'ERROR VERIFY XMLDSIG:',
            error,
        )

        process.exitCode =
            1
    })