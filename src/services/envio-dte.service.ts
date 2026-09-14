import fs from 'fs/promises'
import path from 'path'
import { create } from 'xmlbuilder2'
import type { BillingDocument } from '../models/index.js'
import { getIssuerConfig } from '../config/issuer.config.js'

function getRequiredEnv(name: string) {
    const value = process.env[name]

    if (!value) {
        throw new Error(`${name} no esta configurada`)
    }

    return value
}

function pad(value: number) {
    return String(value).padStart(2, '0')
}

/**
 * Timestamp sin conversión UTC.
 *
 * Formato:
 * YYYY-MM-DDTHH:mm:ss
 *
 * Importante:
 * Node debe ejecutarse posteriormente con la TZ
 * correspondiente al ambiente del emisor.
 */
function formatDateTime(date = new Date()) {
    return [
        date.getFullYear(),
        '-',
        pad(date.getMonth() + 1),
        '-',
        pad(date.getDate()),
        'T',
        pad(date.getHours()),
        ':',
        pad(date.getMinutes()),
        ':',
        pad(date.getSeconds()),
    ].join('')
}

function normalizeRut(value: string) {
    const rut = value
        .trim()
        .replace(/\./g, '')
        .replace(/\s+/g, '')
        .toUpperCase()

    if (!/^\d{1,8}-[\dK]$/.test(rut)) {
        throw new Error(`RUT invalido: ${value}`)
    }

    return rut
}

function countByDocumentType(documents: BillingDocument[]) {
    const counts = new Map<number, number>()

    for (const document of documents) {
        counts.set(
            document.document_type,
            (counts.get(document.document_type) || 0) + 1,
        )
    }

    return Array.from(counts.entries()).map(([TpoDTE, NroDTE]) => ({
        TpoDTE,
        NroDTE,
    }))
}

/**
 * Un DTE incluido dentro de EnvioDTE no puede
 * conservar su propia declaración:
 *
 * <?xml version="1.0" ...?>
 *
 * EnvioDTE será el único documento XML raíz.
 */
function removeXmlDeclaration(xml: string) {
    return xml.replace(/^\s*<\?xml[^?]*\?>\s*/i, '').trim()
}

async function readDocumentXml(document: BillingDocument) {
    if (!document.xml_path) {
        throw new Error(`Documento ${document.id} no tiene XML generado`)
    }

    const xml = await fs.readFile(document.xml_path, 'utf-8')

    const cleanXml = removeXmlDeclaration(xml)

    if (!cleanXml.includes('<DTE')) {
        throw new Error(`Documento ${document.id} no contiene un DTE`)
    }

    if (!cleanXml.includes('<Signature')) {
        throw new Error(`Documento ${document.id} no contiene firma XMLDSIG`)
    }

    return cleanXml
}

export async function generateEnvioDteXml(
    submissionId: string,
    documents: BillingDocument[],
) {
    if (documents.length === 0) {
        throw new Error('Debe incluir al menos un documento en el envio')
    }

    const issuer = getIssuerConfig()

    /**
     * Idealmente SII_RUT_ENVIA debe quedar
     * configurado explícitamente.
     *
     * Mantenemos fallback para no romper
     * tu ambiente actual.
     */
    const rutEnvia = process.env.SII_RUT_ENVIA || getRequiredEnv('ISSUER_RUT')

    const rutReceptor = process.env.SII_RUT_RECEPTOR || '60803000-K'

    const resolutionDate = getRequiredEnv('SII_RESOLUTION_DATE')

    const resolutionNumber = getRequiredEnv('SII_RESOLUTION_NUMBER')

    const dteXmlList = await Promise.all(documents.map(readDocumentXml))

    const setDteId = `SetDTE-${submissionId}`

    const envelopeObject = {
        EnvioDTE: {
            '@xmlns': 'http://www.sii.cl/SiiDte',

            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',

            '@xsi:schemaLocation': 'http://www.sii.cl/SiiDte EnvioDTE_v10.xsd',

            '@version': '1.0',

            SetDTE: {
                '@ID': setDteId,

                Caratula: {
                    '@version': '1.0',

                    RutEmisor: normalizeRut(issuer.rut),

                    RutEnvia: normalizeRut(rutEnvia),

                    RutReceptor: normalizeRut(rutReceptor),

                    FchResol: resolutionDate,

                    NroResol: Number(resolutionNumber),

                    TmstFirmaEnv: formatDateTime(),

                    SubTotDTE: countByDocumentType(documents),
                },

                DTE_PLACEHOLDER: '__DTE_PLACEHOLDER__',
            },
        },
    }

    let xml = create(envelopeObject).end({
        prettyPrint: true,
    })

    xml = xml.replace(
        '<DTE_PLACEHOLDER>__DTE_PLACEHOLDER__</DTE_PLACEHOLDER>',
        dteXmlList.join('\n'),
    )

    /**
     * xmlbuilder2 genera su declaración.
     * La sustituimos explícitamente porque
     * el archivo físico será ISO-8859-1.
     */
    xml = xml.replace(
        /^<\?xml[^?]*\?>/,
        '<?xml version="1.0" encoding="ISO-8859-1"?>',
    )

    const outputDir = path.resolve(
        process.env.OUTPUT_ENVIOS_DIR || 'output/envios',
    )

    await fs.mkdir(outputDir, {
        recursive: true,
    })

    const envelopePath = path.join(outputDir, `envio-${submissionId}.xml`)

    /**
     * El archivo declarado ISO-8859-1
     * se escribe realmente como Latin-1.
     */
    await fs.writeFile(envelopePath, Buffer.from(xml, 'latin1'))

    return {
        envelopePath,
        xml,
        setDteId,
        documentCount: documents.length,
        documentTypes: countByDocumentType(documents),
    }
}
