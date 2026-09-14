import 'dotenv/config'

import {
    getSiiAuthToken,
} from '../src/services/sii/sii-auth.service.js'

async function main() {
    console.log()
    console.log(
        'SII - AUTENTICACION CERTIFICACION',
    )

    console.log(
        '────────────────────────────────',
    )

    console.log(
        `Modo: ${process.env.SII_MODE}`,
    )

    const token =
        await getSiiAuthToken()

    if (!token) {
        throw new Error(
            'SII no devolvió TOKEN',
        )
    }

    console.log()
    console.log(
        '✔ Semilla obtenida',
    )

    console.log(
        '✔ Semilla firmada',
    )

    console.log(
        '✔ Firma aceptada por SII',
    )

    console.log(
        '✔ TOKEN obtenido',
    )

    /**
     * No imprimimos el token completo.
     */
    console.log(
        `Token: ${token.slice(0, 8)}...${token.slice(-4)}`,
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