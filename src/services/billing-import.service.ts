import path from 'path'
import type { BillingDocumentInput } from '../types/billing.types.js'
import { parseJsonInvoice } from '../parsers/json.parser.js'
import { parseTxtInvoice } from '../parsers/txt.parser.js'
import { validateBillingInput } from './billing-validator.service.js'
import { normalizeBillingInput } from './billing-normalizer.service.js'
import { createBillingDocument } from './billing-document.service.js'
import { BillingFileImport } from '../models/index.js'
import { generateDteXml } from './dte-xml.services.js'

type ProcessBillingFileOptions = {
    externalProvider?: string | null
    externalOrderId?: string | null
    externalPaymentId?: string | null
}

async function processBillingFileWithImport(
    filePath: string,
    fileImport: BillingFileImport,
    options: ProcessBillingFileOptions = {},
): Promise<Awaited<ReturnType<typeof createBillingDocument>>> {
    try {
        await fileImport.update({
            status: 'processing',
            error_message: null,
            processed_at: null,
        })

        const input = await parseBillingFile(filePath)

        const validation = validateBillingInput(input)

        if (!validation.valid) {
            throw new Error(validation.errors.join(' | '))
        }

        const normalized = normalizeBillingInput(input)
        const document = await createBillingDocument(normalized, {
            sourceType: 'file',
            sourceFilename: fileImport.filename,
            externalProvider: options.externalProvider,
            externalOrderId: options.externalOrderId,
            externalPaymentId: options.externalPaymentId,
        })

        await fileImport.update({
            status: 'processed',
            error_message: null,
            processed_at: new Date(),
        })

        return document
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        await fileImport.update({
            status: 'error',
            error_message: message,
            processed_at: new Date(),
        })

        throw error
    }
}

async function parseBillingFile(filePath: string): Promise<BillingDocumentInput> {
    const ext = path.extname(filePath).toLowerCase()

    if (ext === '.json') {
        return parseJsonInvoice(filePath)
    }

    if (ext === '.txt') {
        return parseTxtInvoice(filePath)
    }

    throw new Error(`Extensión no soportada: ${ext}`)
}

export async function processBillingFile(
    filePath: string,
    options: ProcessBillingFileOptions = {},
): Promise<Awaited<ReturnType<typeof createBillingDocument>>> {
    const filename = path.basename(filePath)
    const fileImport = await BillingFileImport.create({
        filename,
        original_path: filePath,
        status: 'processing',
        error_message: null,
        processed_at: null,
    })

    return processBillingFileWithImport(filePath, fileImport, options)
}

export async function retryBillingFileImport(
    importId: string,
    filePath: string,
    options: ProcessBillingFileOptions = {},
): Promise<Awaited<ReturnType<typeof createBillingDocument>>> {
    const fileImport = await BillingFileImport.findByPk(importId)

    if (!fileImport) {
        throw new Error('Import no encontrado')
    }

    return processBillingFileWithImport(filePath, fileImport, options)
}

export async function importBillingFileToDatabase(filePath: string) {
    const filename = path.basename(filePath)

    const fileImport = await BillingFileImport.create({
        filename,
        original_path: filePath,
        status: 'processing',
        error_message: null,
        processed_at: null,
    })

    try {
        const input = await parseBillingFile(filePath)

        if (!input) {
            throw new Error('No se pudo parsear el archivo')
        }

        const validation = validateBillingInput(input)

        if (!validation.valid) {
            throw new Error(validation.errors.join(' | '))
        }

        const normalized = normalizeBillingInput(input)

        const document = await createBillingDocument(normalized, {
            sourceType: 'file',
            sourceFilename: filename,
        })

        if (!document) {
            throw new Error('No se pudo crear el documento')
        }

        const xmlResult = await generateDteXml(document.id)

        await fileImport.update({
            status: 'processed',
            processed_at: new Date(),
        })

        return {
            fileImport,
            document: xmlResult.document,
            xmlPath: xmlResult.xmlPath,
        }
    } catch (error: any) {
        await fileImport.update({
            status: 'error',
            error_message: error.message || 'Error procesando archivo',
            processed_at: new Date(),
        })

        throw error
    }
}