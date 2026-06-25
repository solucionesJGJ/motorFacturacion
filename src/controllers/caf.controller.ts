import type { Request, Response } from 'express'
import {
    BillingCaf,
    BillingFolioSequence,
    sequelize,
} from '../models/index.js'
import { getIssuerConfig } from '../config/issuer.config.js'

/**
 * Registers a CAF range for the configured issuer.
 * Creates the CAF and its folio sequence in one transaction.
 */
export async function createCaf(req: Request, res: Response) {
    try {
        const {
            document_type,
            folio_from,
            folio_to,
            caf_xml,
            private_key,
            public_key,
            authorization_date,
            expires_at,
        } = req.body

        if (!document_type || !folio_from || !folio_to || !caf_xml) {
            return res.status(400).json({
                ok: false,
                message: 'document_type, folio_from, folio_to y caf_xml son obligatorios',
            })
        }

        const issuer = getIssuerConfig()

        const result = await sequelize.transaction(async (transaction) => {
            const caf = await BillingCaf.create(
                {
                    document_type: Number(document_type),
                    issuer_rut: issuer.rut,
                    folio_from: Number(folio_from),
                    folio_to: Number(folio_to),
                    caf_xml,
                    private_key: private_key || null,
                    public_key: public_key || null,
                    authorization_date: authorization_date || null,
                    expires_at: expires_at || null,
                    active: true,
                },
                { transaction },
            )

            const sequence = await BillingFolioSequence.create(
                {
                    document_type: Number(document_type),
                    issuer_rut: issuer.rut,
                    caf_id: caf.id,
                    current_folio: Number(folio_from),
                    folio_from: Number(folio_from),
                    folio_to: Number(folio_to),
                    active: true,
                },
                { transaction },
            )

            return { caf, sequence }
        })

        return res.status(201).json({
            ok: true,
            message: 'CAF creado correctamente',
            data: result,
        })
    } catch (error: any) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: error.message || 'Error creando CAF',
        })
    }
}

export async function getCafs(_req: Request, res: Response) {
    const cafs = await BillingCaf.findAll({
        include: [
            {
                model: BillingFolioSequence,
                as: 'folio_sequences',
            },
        ],
        order: [['createdAt', 'DESC']],
    })

    return res.json({
        ok: true,
        data: cafs,
    })
}
