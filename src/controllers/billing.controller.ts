import type { Request, Response } from 'express'
import type { BillingDocumentInput } from '../types/billing.types.js'
import { validateBillingInput } from '../services/billing-validator.service.js'
import { normalizeBillingInput } from '../services/billing-normalizer.service.js'
import { createBillingDocument } from '../services/billing-document.service.js'
import { signXmlFile } from '../services/xml-sign.service.js'
import { BillingDocument } from '../models/index.js'
import { generatePrintablePdf } from '../services/print/document-print.service.js'
import { generateThermalTicketFile } from '../services/print/thermal-ticket.service.js'
import { loadPfxCertificate } from '../services/certificate.service.js'
import { processBillingDocument } from '../services/billing-process.service.js'
import path from 'path'

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

        const externalId = payload.externalId?.trim() || null

        const document = await createBillingDocument(normalized, {
            sourceType: 'api',

            externalProvider: externalId ? 'TL' : null,

            externalOrderId: externalId,
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

export async function generateBillingThermalTicket(
    req: Request,
    res: Response,
) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const result = await generateThermalTicketFile(id)

        return res.json({
            ok: true,
            message: 'Ticket térmico generado correctamente',
            data: result,
        })
    } catch (error: any) {
        return res.status(500).json({
            ok: false,
            message: error.message || 'Error generando ticket térmico',
        })
    }
}

export async function testCertificate(req: Request, res: Response) {
    try {
        const certificate = await loadPfxCertificate()

        return res.json({
            ok: true,
            message: 'Certificado leído correctamente',
            data: {
                validFrom: certificate.validFrom,
                validTo: certificate.validTo,
                subject: certificate.subject,
                issuer: certificate.issuer,
                serialNumber: certificate.serialNumber,
            },
        })
    } catch (error: any) {
        return res.status(500).json({
            ok: false,
            message: error.message || 'Error leyendo certificado',
        })
    }
}

export async function processBillingDocumentFromApi(
    req: Request,
    res: Response,
) {
    try {
        const id = req.params.id as string

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id inválido',
            })
        }

        const result = await processBillingDocument(id)

        return res.json({
            ok: true,

            message: 'Documento procesado correctamente',

            data: {
                document_id: result.document.id,

                document_type: result.document.document_type,

                folio: result.document.folio,

                status: result.document.status,

                net_amount: Number(result.document.net_amount),

                tax_amount: Number(result.document.tax_amount),

                total_amount: Number(result.document.total_amount),

                sii: {
                    mode: result.siiMode,

                    track_id: result.document.sii_track_id,

                    status: result.submission?.status ?? result.document.status,
                },
            },
        })
    } catch (error: any) {
        console.error('Error procesando documento:', error)

        return res.status(500).json({
            ok: false,

            message: error?.message || 'Error procesando documento',
        })
    }
}

export async function getBillingDocumentPdf(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id inválido',
            })
        }

        const document = await BillingDocument.findByPk(id)

        if (!document) {
            return res.status(404).json({
                ok: false,
                message: 'Documento no encontrado',
            })
        }

        /*
         * Por ahora permitimos impresión
         * cuando el documento ya tiene XML.
         *
         * Más adelante podemos endurecer
         * esto a status === accepted.
         */
        if (!document.xml_path) {
            return res.status(400).json({
                ok: false,
                message: 'El documento todavía no tiene XML generado',
            })
        }

        const result = await generatePrintablePdf(id)

        res.setHeader('Content-Type', 'application/pdf')

        res.setHeader(
            'Content-Disposition',
            `inline; filename="${result.fileName}"`,
        )

        return res.sendFile(path.resolve(result.filePath))
    } catch (error: any) {
        console.error('Error obteniendo PDF DTE:', error)

        return res.status(500).json({
            ok: false,
            message: error?.message || 'Error generando PDF',
        })
    }
}
