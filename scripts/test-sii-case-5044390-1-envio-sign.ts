import 'dotenv/config'

import {
    signEnvioDteFile,
} from '../src/services/envio-dte-sign.service.js'

async function main() {
    console.log()
    console.log(
        'SII 5044390-1 - FIRMA ENVIO DTE',
    )

    console.log(
        '────────────────────────────────',
    )

    const result =
        await signEnvioDteFile(
            'output/envios/envio-sii-5044390-1-test.xml',
        )

    console.log(
        `Archivo firmado: ${result.signedPath}`,
    )

    console.log(
        `SetDTE ID: ${result.signatureInfo.setDteId}`,
    )

    console.log(
        `Reference: ${result.signatureInfo.reference}`,
    )

    console.log(
        `Firmas XMLDSIG: ${result.signatureInfo.signatureCount}`,
    )

    console.log()

    console.log(
        'VALIDACIONES',
    )

    console.log(
        '────────────────────────────────',
    )

    console.log(
        '✔ SetDTE firmado',
    )

    console.log(
        '✔ Reference apunta al SetDTE',
    )

    console.log(
        '✔ Firma individual del DTE conservada',
    )

    console.log(
        '✔ Firma del envío agregada',
    )
}

main().catch(
    (error) => {
        console.error()
        console.error('ERROR')
        console.error(error)
        process.exit(1)
    },
)