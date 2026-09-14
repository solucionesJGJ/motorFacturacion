import 'dotenv/config'
import fs from 'node:fs/promises'

import {
    sequelize,
} from '../src/models/index.js'

import {
    importCafXml,
} from '../src/services/caf-import.service.js'

async function main() {
    const cafPath =
        './dev/caf/CAF-DEV-DTE33-1-100.xml'

    console.log('')
    console.log('Importando CAF DEV...')
    console.log(`Archivo: ${cafPath}`)
    console.log('')

    const xml = await fs.readFile(
        cafPath,
        'utf8',
    )

    const result =
        await importCafXml(xml)

    console.log(
        result.created
            ? 'CAF creado correctamente'
            : 'CAF ya existía',
    )

    console.log('')
    console.log(
        `CAF ID: ${result.caf.id}`,
    )

    console.log(
        `DTE: ${result.caf.document_type}`,
    )

    console.log(
        `Folios: ${result.caf.folio_from} - ${result.caf.folio_to}`,
    )

    if (result.sequence) {
        console.log(
            `Próximo folio: ${result.sequence.current_folio}`,
        )
    }

    console.log('')
    console.log(
        '⚠ CAF DEV — NO UTILIZAR CONTRA SII',
    )
}

main()
    .catch((error) => {
        console.error('')
        console.error(
            'Error importando CAF DEV:',
            error,
        )

        process.exitCode = 1
    })
    .finally(async () => {
        await sequelize.close()
    })