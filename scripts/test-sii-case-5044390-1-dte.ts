import 'dotenv/config'

import {
    sequelize,
} from '../src/database/sequelize.js'

import {
    generateDteXml,
} from '../src/services/dte-xml.services.js'

const DOCUMENT_ID =
    'a819330c-7afa-437f-9d0d-afd31595ae70'

function countMatches(
    value: string,
    regex: RegExp,
) {
    return (
        value.match(regex) || []
    ).length
}

async function main() {
    console.log('')
    console.log(
        'SII 5044390-1 - TEST DTE XML',
    )
    console.log(
        '────────────────────────────────',
    )

    const result =
        await generateDteXml(
            DOCUMENT_ID,
        )

    const xml =
        result.xml

    console.log('')
    console.log('ARCHIVO')
    console.log(
        '────────────────────────────────',
    )
    console.log(
        result.xmlPath,
    )

    console.log('')
    console.log('XML')
    console.log(
        '────────────────────────────────',
    )
    console.log(xml)

    console.log('')
    console.log('VALIDACIONES')
    console.log(
        '────────────────────────────────',
    )

    const checks = [
        [
            'DTE version 1.0',
            xml.includes(
                '<DTE version="1.0">',
            ),
        ],

        [
            'Documento F33T4',
            xml.includes(
                '<Documento ID="F33T4">',
            ),
        ],

        [
            'Tipo DTE 33',
            xml.includes(
                '<TipoDTE>33</TipoDTE>',
            ),
        ],

        [
            'Folio 4',
            xml.includes(
                '<Folio>4</Folio>',
            ),
        ],

        [
            'Neto correcto',
            xml.includes(
                '<MntNeto>349829</MntNeto>',
            ),
        ],

        [
            'IVA correcto',
            xml.includes(
                '<IVA>66468</IVA>',
            ),
        ],

        [
            'Total correcto',
            xml.includes(
                '<MntTotal>416297</MntTotal>',
            ),
        ],

        [
            'Cajón presente',
            xml.includes(
                '<NmbItem>Cajón</NmbItem>',
            ),
        ],

        [
            'Relleno presente',
            xml.includes(
                '<NmbItem>Relleno</NmbItem>',
            ),
        ],

        [
            'TED real',
            xml.includes(
                '<TED version="1.0"><DD>',
            ),
        ],

        [
            'Sin TED_RAW',
            !xml.includes(
                'TED_RAW',
            ),
        ],

        [
            'TED no escapado',
            !xml.includes(
                '&lt;TED',
            ),
        ],
    ] as const

    let failed =
        false

    for (
        const [
            description,
            ok,
        ] of checks
    ) {
        if (ok) {
            console.log(
                `✔ ${description}`,
            )
        } else {
            console.log(
                `✘ ${description}`,
            )

            failed =
                true
        }
    }

    const detailCount =
        countMatches(
            xml,
            /<Detalle>/g,
        )

    const tedCount =
        countMatches(
            xml,
            /<TED\b/g,
        )

    const tmstFirmaCount =
        countMatches(
            xml,
            /<TmstFirma>/g,
        )

    console.log('')
    console.log(
        `Detalle: ${detailCount}`,
    )

    console.log(
        `TED: ${tedCount}`,
    )

    console.log(
        `TmstFirma: ${tmstFirmaCount}`,
    )

    if (
        detailCount !== 2
    ) {
        console.log(
            '✘ Deben existir exactamente 2 Detalle',
        )

        failed =
            true
    } else {
        console.log(
            '✔ Exactamente 2 Detalle',
        )
    }

    if (
        tedCount !== 1
    ) {
        console.log(
            '✘ Debe existir exactamente 1 TED',
        )

        failed =
            true
    } else {
        console.log(
            '✔ Exactamente 1 TED',
        )
    }

    if (
        tmstFirmaCount !== 1
    ) {
        console.log(
            '✘ Debe existir exactamente 1 TmstFirma',
        )

        failed =
            true
    } else {
        console.log(
            '✔ Exactamente 1 TmstFirma',
        )
    }

    if (failed) {
        throw new Error(
            'El DTE no pasó todas las validaciones',
        )
    }

    console.log('')
    console.log(
        '✔ DTE 5044390-1 pasó las validaciones estructurales básicas',
    )
}

main()
    .catch((error) => {
        console.error('')
        console.error(
            'ERROR TEST DTE:',
            error,
        )

        process.exitCode =
            1
    })
    .finally(async () => {
        await sequelize.close()
    })