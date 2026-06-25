import fs from 'fs/promises'
import path from 'path'
import type { Request, Response } from 'express'
import {
    BillingDocument,
    BillingDocumentItem,
    BillingFileImport,
} from '../models/index.js'
import { retryBillingFileImport } from '../services/billing-import.service.js'
import { generateDteXml } from '../services/dte-xml.services.js'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function parsePagination(query: Request['query']) {
    const rawLimit = Number(query.limit)
    const rawOffset = Number(query.offset)

    const limit =
        Number.isInteger(rawLimit) && rawLimit > 0
            ? Math.min(rawLimit, MAX_LIMIT)
            : DEFAULT_LIMIT
    const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0

    return { limit, offset }
}

function getParamId(req: Request) {
    return typeof req.params.id === 'string' ? req.params.id : null
}

async function fileExists(filePath: string) {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

/**
 * Resolves the physical file available for an import retry.
 * Imports can point to their original path or to the worker error directory.
 */
async function resolveImportFilePath(fileImport: BillingFileImport) {
    if (await fileExists(fileImport.original_path)) {
        return fileImport.original_path
    }

    const errorDir = path.resolve(process.env.INPUT_ERROR_DIR || 'input/error')
    const errorPath = path.join(errorDir, fileImport.filename)

    if (await fileExists(errorPath)) {
        return errorPath
    }

    return null
}

export async function listBillingDocuments(req: Request, res: Response) {
    try {
        const { limit, offset } = parsePagination(req.query)
        const where =
            typeof req.query.status === 'string' && req.query.status.trim()
                ? { status: req.query.status.trim() }
                : undefined

        const result = await BillingDocument.findAndCountAll({
            where,
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        })

        return res.json({
            ok: true,
            data: result.rows,
            meta: {
                count: result.count,
                limit,
                offset,
            },
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: 'Error listando documentos',
        })
    }
}

export async function getBillingDocumentById(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const document = await BillingDocument.findByPk(id, {
            include: [{ model: BillingDocumentItem, as: 'items' }],
        })

        if (!document) {
            return res.status(404).json({
                ok: false,
                message: 'Documento no encontrado',
            })
        }

        return res.json({
            ok: true,
            data: document,
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: 'Error obteniendo documento',
        })
    }
}

export async function listBillingImports(req: Request, res: Response) {
    try {
        const { limit, offset } = parsePagination(req.query)
        const where =
            typeof req.query.status === 'string' && req.query.status.trim()
                ? { status: req.query.status.trim() }
                : undefined

        const result = await BillingFileImport.findAndCountAll({
            where,
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        })

        return res.json({
            ok: true,
            data: result.rows,
            meta: {
                count: result.count,
                limit,
                offset,
            },
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: 'Error listando imports',
        })
    }
}

/**
 * Reprocesses a previous file import using the same import record.
 * This keeps audit history stable while creating a fresh billing document.
 */
export async function retryBillingImport(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const fileImport = await BillingFileImport.findByPk(id)

        if (!fileImport) {
            return res.status(404).json({
                ok: false,
                message: 'Import no encontrado',
            })
        }

        const filePath = await resolveImportFilePath(fileImport)

        if (!filePath) {
            return res.status(409).json({
                ok: false,
                message: 'Archivo de import no disponible para reintento',
            })
        }

        const document = await retryBillingFileImport(fileImport.id, filePath)

        return res.status(201).json({
            ok: true,
            message: 'Import reprocesado correctamente',
            data: document,
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: 'Error reintentando import',
        })
    }
}

export async function getBillingFileImportById(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const fileImport = await BillingFileImport.findByPk(id)

        if (!fileImport) {
            return res.status(404).json({
                ok: false,
                message: 'Importación no encontrada',
            })
        }

        return res.json({
            ok: true,
            data: fileImport,
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: 'Error obteniendo importación',
        })
    }
}

/**
 * Generates the DTE XML for an existing billing document.
 * The XML generation service also updates status and xml_path on success.
 */
export async function generateBillingDocumentXml(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const result = await generateDteXml(id)

        return res.json({
            ok: true,
            message: 'XML generado correctamente',
            data: {
                document_id: result.document.id,
                xml_path: result.xmlPath,
            },
        })
    } catch (error: any) {
        console.error(error)

        return res.status(500).json({
            ok: false,
            message: error.message || 'Error generando XML',
        })
    }
}
