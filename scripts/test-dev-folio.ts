import 'dotenv/config'

import {
    BillingFolioSequence,
    sequelize,
} from '../src/models/index.js'

import {
    assignNextFolio,
} from '../src/services/folio.service.js'

async function main() {
    console.log('')
    console.log('Probando asignación de folio DEV...')

    /**
     * Primero asignamos el folio.
     *
     * assignNextFolio es quien determina qué secuencia
     * corresponde utilizar.
     */
    const assigned = await assignNextFolio(33)

    console.log('')
    console.log(`Folio asignado = ${assigned.folio}`)
    console.log(`CAF ID = ${assigned.cafId}`)

    /**
     * Ahora buscamos específicamente la secuencia
     * asociada al CAF que realmente fue utilizado.
     */
    const sequence =
        await BillingFolioSequence.findOne({
            where: {
                caf_id: assigned.cafId,
                document_type: 33,
            },
        })

    if (!sequence) {
        throw new Error(
            'No se encontró la secuencia asociada al CAF utilizado',
        )
    }

    console.log('')
    console.log(
        `Rango CAF = ${sequence.folio_from} - ${sequence.folio_to}`,
    )

    console.log(
        `Próximo folio = ${sequence.current_folio}`,
    )

    /**
     * Comprobación real.
     */
    if (
        sequence.current_folio !==
        assigned.folio + 1
    ) {
        throw new Error(
            `Secuencia inconsistente: se asignó ${assigned.folio}, pero current_folio quedó en ${sequence.current_folio}`,
        )
    }

    console.log('')
    console.log('✔ Secuencia incrementada correctamente')
}

main()
    .catch((error) => {
        console.error('')
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await sequelize.close()
    })