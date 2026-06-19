import type { Request, Response } from 'express'
import type { BillingDocumentInput } from '../types/billing.types.js'
import { validateBillingInput } from '../services/billing-validator.service.js'
import { normalizeBillingInput } from '../services/billing-normalizer.service.js'
import { createBillingDocument } from '../services/billing-document.service.js'

export async function createInvoiceFromApi(req: Request, res: Response) {
    try {
        const payload = req.body as BillingDocumentInput

        const validation = validateBillingInput(payload)

        if (!validation.valid) {
            return res.status(400).json({
                ok: false,
                message: 'Documento inválido',
                errors: validation.errors,
            })
        }

        const normalized = normalizeBillingInput(payload)

        const document = await createBillingDocument(normalized, {
            sourceType: 'api',
        })

        return res.status(201).json({
            ok: true,
            message: 'Documento creado correctamente',
            data: document,
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: 'Error creando documento',
        })
    }
}