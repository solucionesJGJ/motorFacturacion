import 'dotenv/config'

import { sequelize } from '../src/models/index.js'

import {
    buildTed,
} from '../src/services/ted.service.js'

const DOCUMENT_ID =
    'a819330c-7afa-437f-9d0d-afd31595ae70'

async function main() {
    console.log('')
    console.log('SII 5044390-1 - TEST TED')
    console.log('────────────────────────────────')
    console.log(`Documento: ${DOCUMENT_ID}`)
    console.log('')

    const result =
        await buildTed(DOCUMENT_ID)

    console.log('DD XML')
    console.log('────────────────────────────────')
    console.log(result.ddXml)
    console.log('')

    console.log('FRMT')
    console.log('────────────────────────────────')
    console.log(result.frmt)
    console.log('')

    console.log('TED XML')
    console.log('────────────────────────────────')
    console.log(result.tedXml)
    console.log('')

    /**
     * Validaciones básicas de estructura.
     */

    const checks = [
        {
            name: 'DD presente',
            ok:
                result.ddXml.includes('<DD>') &&
                result.ddXml.includes('</DD>'),
        },

        {
            name: 'RUT emisor presente',
            ok:
                result.ddXml.includes('<RE>'),
        },

        {
            name: 'Tipo DTE 33',
            ok:
                result.ddXml.includes('<TD>33</TD>'),
        },

        {
            name: 'Folio 4',
            ok:
                result.ddXml.includes('<F>4</F>'),
        },

        {
            name: 'Monto total correcto',
            ok:
                result.ddXml.includes(
                    '<MNT>416297</MNT>',
                ),
        },

        {
            name: 'Primer item correcto',
            ok:
                result.ddXml.includes(
                    '<IT1>Cajón</IT1>',
                ),
        },

        {
            name: 'CAF incluido',
            ok:
                result.ddXml.includes('<CAF'),
        },

        {
            name: 'TSTED incluido',
            ok:
                result.ddXml.includes('<TSTED>'),
        },

        {
            name: 'FRMT existente',
            ok:
                typeof result.frmt === 'string' &&
                result.frmt.length > 0,
        },

        {
            name: 'FRMT no es DEMO',
            ok:
                result.frmt !==
                'FRMT_DEMO_PENDIENTE_LLAVE_PRIVADA',
        },

        {
            name: 'TED presente',
            ok:
                result.tedXml.includes(
                    '<TED version="1.0">',
                ),
        },

        {
            name: 'Algoritmo FRMT correcto',
            ok:
                result.tedXml.includes(
                    'algoritmo="SHA1withRSA"',
                ),
        },
    ]

    console.log('VALIDACIONES')
    console.log('────────────────────────────────')

    let failures = 0

    for (const check of checks) {
        if (check.ok) {
            console.log(`✔ ${check.name}`)
        } else {
            console.log(`✘ ${check.name}`)
            failures++
        }
    }

    console.log('')

    /**
     * Validación adicional del FRMT.
     *
     * Una firma RSA en Base64 debe poder
     * decodificarse correctamente.
     */
    try {
        const signatureBuffer =
            Buffer.from(
                result.frmt,
                'base64',
            )

        console.log(
            `FRMT bytes: ${signatureBuffer.length}`,
        )

        if (signatureBuffer.length === 0) {
            failures++
            console.log(
                '✘ FRMT Base64 vacío',
            )
        } else {
            console.log(
                '✔ FRMT decodifica como Base64',
            )
        }
    } catch {
        failures++

        console.log(
            '✘ FRMT no es Base64 válido',
        )
    }

    console.log('')

    if (failures > 0) {
        throw new Error(
            `TED falló ${failures} validación(es)`,
        )
    }

    console.log(
        '✔ TED pasó las validaciones básicas',
    )
}

main()
    .catch((error) => {
        console.error('')
        console.error(
            'ERROR TEST TED:',
            error,
        )

        process.exitCode = 1
    })
    .finally(async () => {
        await sequelize.close()
    })