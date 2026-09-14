import 'dotenv/config'

import path from 'node:path'

import {
    SiiClient,
} from '../src/services/sii/sii-client.js'

async function main() {
    console.log()
    console.log(
        'SII - UPLOAD CERTIFICACION',
    )

    console.log(
        '────────────────────────────────',
    )

    console.log(
        `Modo: ${process.env.SII_MODE}`,
    )

    const signedEnvelopePath =
        path.resolve(
            'output',
            'envios',
            'envio-sii-5044390-1-test-signed.xml',
        )

    console.log(
        `Archivo: ${signedEnvelopePath}`,
    )

    const sii =
        new SiiClient()

    const result =
        await sii.uploadEnvelope(
            signedEnvelopePath,
        )

    console.log()
    console.log(
        '✔ Upload realizado',
    )

    console.log(
        `TrackID: ${result.trackId}`,
    )

    console.log()
    console.log(
        'Respuesta SII:',
    )

    console.dir(
        result.rawResponse,
        {
            depth: null,
        },
    )
}

main().catch(
    error => {
        console.error()
        console.error('ERROR')
        console.error(error)
        process.exit(1)
    },
)