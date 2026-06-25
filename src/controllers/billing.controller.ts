import type { Request, Response } from 'express'
import type { BillingDocumentInput } from '../types/billing.types.js'
import { validateBillingInput } from '../services/billing-validator.service.js'
import { normalizeBillingInput } from '../services/billing-normalizer.service.js'
import { createBillingDocument } from '../services/billing-document.service.js'
import { signXmlFile } from '../services/xml-sign.service.js'
import { BillingDocument } from '../models/index.js'
import { generatePrintablePdf } from '../services/print/document-print.service.js'

function getParamId(req: Request) {
    return typeof req.params.id === 'string' ? req.params.id : null
}

/**
 * Creates a billing document from an API payload.
 * The payload is validated, normalized and persisted with sourceType=api.
 */
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

/**
 * Signs the XML file already generated for a billing document.
 * Updates the document to status=signed and points xml_path to the signed file.
 */
export async function signBillingDocumentXml(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const document = await BillingDocument.findByPk(id)

        if (!document) {
            return res.status(404).json({
                ok: false,
                message: 'Documento no encontrado',
            })
        }

        if (!document.xml_path) {
            return res.status(400).json({
                ok: false,
                message: 'El documento no tiene XML generado',
            })
        }

        const result = await signXmlFile(document.xml_path)

        await document.update({
            xml_path: result.signedPath,
            status: 'signed',
        })

        return res.json({
            ok: true,
            message: 'XML firmado correctamente',
            data: {
                document_id: document.id,
                signed_path: result.signedPath,
            },
        })
    } catch (error: any) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: error.message || 'Error firmando XML',
        })
    }
}

export async function printBillingDocument(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const result = await generatePrintablePdf(id)

        return res.json({
            ok: true,
            message: 'PDF de impresión generado correctamente',
            data: result,
        })
    } catch (error: any) {
        return res.status(500).json({
            ok: false,
            message: error.message || 'Error generando impresión',
        })
    }
}

export async function downloadPrintedDocument(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const document = await BillingDocument.findByPk(id)

        if (!document || !document.pdf_print_path) {
            return res.status(404).json({
                ok: false,
                message: 'PDF no encontrado',
            })
        }

        return res.download(document.pdf_print_path)
    } catch (error: any) {
        return res.status(500).json({
            ok: false,
            message: error.message || 'Error descargando PDF',
        })
    }
}