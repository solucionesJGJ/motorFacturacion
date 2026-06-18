import type { Request, Response } from 'express'
import type { BillingDocumentInput } from '../types/billing.type.js'

export async function createInvoiceFromApi(req: Request, res: Response) {
    try {
        const payload = req.body as BillingDocumentInput

        if (!payload.documentType) {
            return res.status(400).json({
                ok: false,
                message: 'documentType es obligatorio',
            })
        }

        if (!payload.receiver?.rut || !payload.receiver?.razonSocial) {
            return res.status(400).json({
                ok: false,
                message: 'receiver.rut y receiver.razonSocial son obligatorios',
            })
        }

        if (!payload.items?.length) {
            return res.status(400).json({
                ok: false,
                message: 'Debe incluir al menos un item',
            })
        }

        return res.status(201).json({
            ok: true,
            message: 'Documento recibido correctamente',
            data: payload,
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: 'Error creando documento',
        })
    }
}