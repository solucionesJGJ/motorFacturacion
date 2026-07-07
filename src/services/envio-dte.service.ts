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

function formatDateTime(date = new Date()) {
    return date.toISOString().slice(0, 19)
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

async function readDocumentXml(document: BillingDocument) {
    if (!document.xml_path) {
        throw new Error(`Documento ${document.id} no tiene XML generado`)
    }

    return fs.readFile(document.xml_path, 'utf-8')
}

export async function generateEnvioDteXml(
    submissionId: string,
    documents: BillingDocument[],
) {
    if (documents.length === 0) {
        throw new Error('Debe incluir al menos un documento en el envio')
    }

    const issuer = getIssuerConfig()
    const rutEnvia = /* getRequiredEnv('SII_RUT_ENVIA') ||  */getRequiredEnv('ISSUER_RUT')
    const rutReceptor = process.env.SII_RUT_RECEPTOR || '60803000-K'
    const resolutionDate = getRequiredEnv('SII_RESOLUTION_DATE')
    const resolutionNumber = getRequiredEnv('SII_RESOLUTION_NUMBER')
    const dteXmlList = await Promise.all(documents.map(readDocumentXml))

    const envelopeObject = {
        EnvioDTE: {
            '@version': '1.0',
            SetDTE: {
                '@ID': `SetDTE-${submissionId}`,
                Caratula: {
                    '@version': '1.0',
                    RutEmisor: issuer.rut,
                    RutEnvia: rutEnvia,
                    RutReceptor: rutReceptor,
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

    const outputDir = path.resolve(process.env.OUTPUT_ENVIOS_DIR || 'output/envios')
    await fs.mkdir(outputDir, { recursive: true })

    const envelopePath = path.join(outputDir, `envio-${submissionId}.xml`)

    await fs.writeFile(envelopePath, xml, 'utf-8')

    return {
        envelopePath,
        xml,
    }
}
