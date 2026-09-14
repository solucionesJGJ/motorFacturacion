import { BillingCaf, BillingFolioSequence, sequelize } from '../models/index.js'

import { parseCafXml } from './caf-parser.service.js'
import { getIssuerConfig } from '../config/issuer.config.js'

export async function importCafXml(cafXml: string) {
    const parsed = parseCafXml(cafXml)
    const issuer = getIssuerConfig()

    /**
     * Seguridad básica:
     * el CAF debe corresponder al emisor configurado.
     */
    if (parsed.rutEmisor !== issuer.rut) {
        throw new Error(
            `El RUT del CAF (${parsed.rutEmisor}) no corresponde al emisor configurado (${issuer.rut})`,
        )
    }

    return sequelize.transaction(async (transaction) => {
        /**
         * Evitamos importar dos veces exactamente
         * el mismo rango para el mismo tipo de DTE/emisor.
         */
        const existingCaf = await BillingCaf.findOne({
            where: {
                document_type: parsed.documentType,
                issuer_rut: parsed.rutEmisor,
                folio_from: parsed.folioFrom,
                folio_to: parsed.folioTo,
            },
            transaction,
        })

        if (existingCaf) {
            const existingSequence = await BillingFolioSequence.findOne({
                where: {
                    caf_id: existingCaf.id,
                },
                transaction,
            })

            return {
                caf: existingCaf,
                sequence: existingSequence,
                created: false,
            }
        }

        const caf = await BillingCaf.create(
            {
                document_type: parsed.documentType,
                issuer_rut: parsed.rutEmisor,
                folio_from: parsed.folioFrom,
                folio_to: parsed.folioTo,

                caf_xml: parsed.cafXml,

                private_key: parsed.privateKey || null,

                public_key: parsed.publicKey || null,

                authorization_date: parsed.authorizationDate
                    ? new Date(parsed.authorizationDate)
                    : null,

                expires_at: null,
                active: true,
            },
            {
                transaction,
            },
        )

        const sequence = await BillingFolioSequence.create(
            {
                document_type: parsed.documentType,

                issuer_rut: parsed.rutEmisor,

                caf_id: caf.id,

                current_folio: parsed.folioFrom,

                folio_from: parsed.folioFrom,

                folio_to: parsed.folioTo,

                active: true,
            },
            {
                transaction,
            },
        )

        return {
            caf,
            sequence,
            created: true,
        }
    })
}
