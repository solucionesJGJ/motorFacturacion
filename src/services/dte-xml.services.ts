import fs from 'fs/promises'
import path from 'path'
import { create } from 'xmlbuilder2'
import {
    BillingDocument,
    BillingDocumentItem
} from '../models/index.js'

export async function generateDteXml(documentId: string) {
    const document = await BillingDocument.findByPk(documentId, {
        include: [{ model: BillingDocumentItem, as: 'items' }],
    })

    if (!document) {
        throw new Error('Documento no encontrado')
    }

    const docJson = document.toJSON() as any

    const xmlObject = {
        DTE: {
            '@version': '1.0',
            Documento: {
                '@ID': `DTE-${document.id}`,
                Encabezado: {
                    IdDoc: {
                        TipoDTE: document.document_type,
                        Folio: document.folio || 0,
                        FchEmis: new Date().toISOString().slice(0, 10),
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
                        MntNeto: Number(document.net_amount),
                        IVA: Number(document.tax_amount),
                        MntTotal: Number(document.total_amount),
                    },
                },
                Detalle: docJson.items.map((item: any) => ({
                    NroLinDet: item.line_number,
                    NmbItem: item.description,
                    QtyItem: Number(item.quantity),
                    PrcItem: Number(item.unit_price),
                    MontoItem: Number(item.net_amount),
                })),
            },
        },
    }

    const xml = create(xmlObject).end({
        prettyPrint: true,
    })

    const outputDir = path.resolve(process.env.OUTPUT_XML_DIR || 'output/xml')
    await fs.mkdir(outputDir, { recursive: true })

    const filename = `dte-${document.id}.xml`
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