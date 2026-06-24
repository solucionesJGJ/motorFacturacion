import fs from 'fs/promises'
import path from 'path'
import { create } from 'xmlbuilder2'
import {
    BillingDocument,
    BillingDocumentItem,
} from '../models/index.js'
import { getIssuerConfig } from '../config/issuer.config.js'

function toInteger(value: unknown) {
    return Math.round(Number(value || 0))
}

function formatDate(date = new Date()) {
    return date.toISOString().slice(0, 10)
}

function buildDocumentId(documentType: number, folio: number | null) {
    return `F${documentType}T${folio || 0}`
}

export async function generateDteXml(documentId: string) {
    const document = await BillingDocument.findByPk(documentId, {
        include: [{ model: BillingDocumentItem, as: 'items' }],
    })

    if (!document) {
        throw new Error('Documento no encontrado')
    }

    const issuer = getIssuerConfig()
    const docJson = document.toJSON() as any
    const folio = Number(document.folio || 0)
    const documentXmlId = buildDocumentId(document.document_type, folio)

    const detalle = docJson.items.map((item: any) => ({
        NroLinDet: Number(item.line_number),
        NmbItem: item.description,
        QtyItem: Number(item.quantity),
        PrcItem: toInteger(item.unit_price),
        MontoItem: toInteger(item.net_amount),
    }))

    const xmlObject = {
        DTE: {
            '@version': '1.0',
            Documento: {
                '@ID': documentXmlId,

                Encabezado: {
                    IdDoc: {
                        TipoDTE: Number(document.document_type),
                        Folio: folio,
                        FchEmis: formatDate(),
                    },

                    Emisor: {
                        RUTEmisor: issuer.rut,
                        RznSoc: issuer.razonSocial,
                        GiroEmis: issuer.giro,
                        ...(issuer.acteco ? { Acteco: issuer.acteco } : {}),
                        DirOrigen: issuer.direccion,
                        CmnaOrigen: issuer.comuna,
                        CiudadOrigen: issuer.ciudad,
                    },

                    Receptor: {
                        RUTRecep: document.receiver_rut,
                        RznSocRecep: document.receiver_name,
                        GiroRecep: document.receiver_giro || 'Sin giro informado',
                        DirRecep: document.receiver_address || 'Sin dirección',
                        CmnaRecep: document.receiver_comuna || 'Sin comuna',
                        CiudadRecep: document.receiver_ciudad || 'Sin ciudad',
                    },

                    Totales: {
                        MntNeto: toInteger(document.net_amount),
                        TasaIVA: 19,
                        IVA: toInteger(document.tax_amount),
                        MntTotal: toInteger(document.total_amount),
                    },
                },

                Detalle: detalle,

                // Pendiente:
                // TED: se genera con CAF y llave privada de timbraje.
                // TmstFirma: fecha/hora de firma del timbre.
            },
        },
    }

    const xml = create(xmlObject).end({
        prettyPrint: true,
    })

    const outputDir = path.resolve(process.env.OUTPUT_XML_DIR || 'output/xml')
    await fs.mkdir(outputDir, { recursive: true })

    const filename = `dte-${document.document_type}-${folio || document.id}.xml`
    const xmlPath = path.join(outputDir, filename)

    await fs.writeFile(xmlPath, xml, 'utf-8')

    await document.update({
        xml_path: xmlPath,
        status: 'xml_generated',
    })

    return {
        document,
        xmlPath,
        xml,
    }
}