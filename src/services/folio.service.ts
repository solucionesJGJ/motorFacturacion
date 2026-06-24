import { Transaction } from 'sequelize'
import {
    BillingCaf,
    BillingFolioSequence,
    sequelize,
} from '../models/index.js'
import { getIssuerConfig } from '../config/issuer.config.js'

type AssignedFolio = {
    folio: number
    cafId: string
}

export async function assignNextFolio(
    documentType: number,
    transaction?: Transaction,
): Promise<AssignedFolio> {
    const issuer = getIssuerConfig()

    const run = async (trx: Transaction) => {
        const sequence = await BillingFolioSequence.findOne({
            where: {
                document_type: documentType,
                issuer_rut: issuer.rut,
                active: true,
            },
            include: [
                {
                    model: BillingCaf,
                    as: 'caf',
                    where: {
                        active: true,
                    },
                },
            ],
            order: [['folio_from', 'ASC']],
            transaction: trx,
            lock: trx.LOCK.UPDATE,
        })

        if (!sequence) {
            throw new Error(`No existe secuencia activa de folios para DTE ${documentType}`)
        }

        if (sequence.current_folio > sequence.folio_to) {
            await sequence.update({ active: false }, { transaction: trx })
            throw new Error(`CAF sin folios disponibles para DTE ${documentType}`)
        }

        const folio = sequence.current_folio

        await sequence.update(
            {
                current_folio: sequence.current_folio + 1,
            },
            { transaction: trx },
        )

        return {
            folio,
            cafId: sequence.caf_id,
        }
    }

    if (transaction) {
        return run(transaction)
    }

    return sequelize.transaction(run)
}