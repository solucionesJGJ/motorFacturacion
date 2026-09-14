import 'dotenv/config'
import fs from 'fs/promises'

import {
    BillingDocument,
} from '../src/models/index.js'

import {
    generateEnvioDteXml,
} from '../src/services/envio-dte.service.js'

const DOCUMENT_ID =
    'a819330c-7afa-437f-9d0d-afd31595ae70'

const SIGNED_DTE_PATH =
    'output/xml/dte-33-4-signed.xml'

async function main() {
    console.log()
    console.log(
        'SII 5044390-1 - ENVIO DTE BASE',
    )

    console.log(
        '────────────────────────────────',
    )

    const document =
        await BillingDocument.findByPk(
            DOCUMENT_ID,
        )

    if (!document) {
        throw new Error(
            `No existe BillingDocument ${DOCUMENT_ID}`,
        )
    }

    console.log(
        `Documento: ${document.id}`,
    )

    console.log(
        `Tipo DTE: ${document.document_type}`,
    )

    console.log(
        `Folio: ${document.folio}`,
    )

    /**
     * Para este test NO modificamos la BD.
     *
     * El DTE firmado ya existe localmente,
     * por lo que sustituimos xml_path
     * solamente en memoria.
     */
    document.setDataValue(
        'xml_path',
        SIGNED_DTE_PATH,
    )

    const signedDte =
        await fs.readFile(
            SIGNED_DTE_PATH,
            'utf-8',
        )

    if (
        !signedDte.includes(
            '<Signature',
        )
    ) {
        throw new Error(
            'El DTE de prueba no está firmado',
        )
    }

    const submissionId =
        'sii-5044390-1-test'

    const result =
        await generateEnvioDteXml(
            submissionId,
            [document],
        )

    console.log()
    console.log(
        `Archivo: ${result.envelopePath}`,
    )

    console.log(
        `SetDTE ID: ${result.setDteId}`,
    )

    console.log(
        `Documentos: ${result.documentCount}`,
    )

    console.log()

    const buffer =
        await fs.readFile(
            result.envelopePath,
        )

    const xml =
        buffer.toString(
            'latin1',
        )

    console.log(
        'VALIDACIONES',
    )

    console.log(
        '────────────────────────────────',
    )

    const checks = [
        [
            'Declaración ISO-8859-1',
            xml.startsWith(
                '<?xml version="1.0" encoding="ISO-8859-1"?>',
            ),
        ],

        [
            'Namespace SII',
            xml.includes(
                'xmlns="http://www.sii.cl/SiiDte"',
            ),
        ],

        [
            'EnvioDTE version 1.0',
            xml.includes(
                '<EnvioDTE',
            ) &&
            xml.includes(
                'version="1.0"',
            ),
        ],

        [
            'SetDTE presente',
            xml.includes(
                `<SetDTE ID="${result.setDteId}">`,
            ),
        ],

        [
            'Caratula presente',
            xml.includes(
                '<Caratula version="1.0">',
            ),
        ],

        [
            'Tipo DTE 33',
            xml.includes(
                '<TpoDTE>33</TpoDTE>',
            ),
        ],

        [
            'Cantidad DTE = 1',
            xml.includes(
                '<NroDTE>1</NroDTE>',
            ),
        ],

        [
            'Documento F33T4',
            xml.includes(
                'ID="F33T4"',
            ),
        ],

        [
            'DTE firmado incluido',
            xml.includes(
                '<Signature',
            ),
        ],

        [
            'Sin declaración XML interna',
            (
                xml.match(
                    /<\?xml/g,
                ) || []
            ).length === 1,
        ],
    ] as const

    let failed = false

    for (
        const [
            description,
            ok,
        ] of checks
    ) {
        console.log(
            ok
                ? `✔ ${description}`
                : `✘ ${description}`,
        )

        if (!ok) {
            failed = true
        }
    }

    if (failed) {
        throw new Error(
            'Fallaron validaciones del EnvioDTE base',
        )
    }

    console.log()
    console.log(
        '✔ EnvioDTE base generado correctamente',
    )

    console.log()
    console.log(
        'NOTA: SetDTE todavía NO está firmado.',
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