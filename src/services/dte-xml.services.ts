import fs from 'fs/promises'
import path from 'path'
import { create } from 'xmlbuilder2'

import { BillingDocument, BillingDocumentItem } from '../models/index.js'

import { getIssuerConfig } from '../config/issuer.config.js'

import { buildTed } from './ted.service.js'

import { buildDte52XmlObject } from './dte52/dte52-builder.service.js'

function toInteger(value: unknown) {
    return Math.round(Number(value || 0))
}

function formatDate(date: Date) {
    return date.toISOString().slice(0, 10)
}

function formatTimestamp(date: Date) {
    return date.toISOString().slice(0, 19)
}

function normalizeRut(value: unknown) {
    const rut = String(value || '')
        .trim()
        .replace(/\./g, '')
        .replace(/\s/g, '')
        .toUpperCase()

    if (!/^\d{1,8}-[\dK]$/.test(rut)) {
        throw new Error(`RUT inválido para DTE: ${value}`)
    }

    return rut
}

function buildDocumentId(documentType: number, folio: number) {
    return `F${documentType}T${folio}`
}

/**
 * Inserta XML real inmediatamente antes
 * del cierre de Documento.
 *
 * TED ya viene construido como XML,
 * por lo que NO debe pasar nuevamente
 * como texto por xmlbuilder2.
 */
function insertBeforeDocumentClose(xml: string, content: string) {
    const marker = '</Documento>'

    const position = xml.lastIndexOf(marker)

    if (position === -1) {
        throw new Error('No se encontró </Documento> en el DTE generado')
    }

    return xml.slice(0, position) + content + xml.slice(position)
}

export async function generateDteXml(
    documentId: string,
    generatedAt = new Date(),
) {
    const document = await BillingDocument.findByPk(documentId, {
        include: [
            {
                model: BillingDocumentItem,

                as: 'items',
            },
        ],
    })

    if (!document) {
        throw new Error('Documento no encontrado')
    }

    if (!document.folio) {
        throw new Error('El documento no tiene folio asignado')
    }

    const issuer = getIssuerConfig()

    const docJson = document.toJSON() as any

    const items = docJson.items || []

    if (items.length === 0) {
        throw new Error('El documento no contiene items')
    }

    const folio = Number(document.folio)

    const documentType = Number(document.document_type)

    const documentXmlId = buildDocumentId(documentType, folio)

    /**
     * Un único instante de generación.
     *
     * Lo usamos para:
     *
     * FchEmis
     * TSTED (dentro de buildTed)
     * TmstFirma
     */
    const emissionDate = formatDate(generatedAt)

    const signatureTimestamp = formatTimestamp(generatedAt)

    /**
     * DETALLE
     */
    const detalle33 = docJson.items.map((item: any) => {
        const discountPercentage = Number(item.discount_percentage || 0)

        const discountAmount = toInteger(item.discount_amount || 0)

        return {
            NroLinDet: Number(item.line_number),

            NmbItem: item.description,

            QtyItem: Number(item.quantity),

            PrcItem: toInteger(item.unit_price),

            ...(discountPercentage > 0
                ? {
                      DescuentoPct: discountPercentage,

                      DescuentoMonto: discountAmount,
                  }
                : {}),

            MontoItem: toInteger(item.net_amount),
        }
    })

    /**
     * Generamos TED.
     *
     * Si falla, el DTE NO debe continuar.
     *
     * Un DTE 33 certificable no debería
     * esconder un error del TED mediante
     * console.warn().
     */
    const ted = await buildTed(documentId, generatedAt)

    /**
     * Construimos primero Documento
     * SIN TED.
     *
     * El TED se insertará después como
     * XML real.
     */
    /**
     * =====================================================
     * CONSTRUCTOR POR TIPO DTE
     * =====================================================
     *
     * DTE 33 conserva literalmente su estructura histórica.
     * DTE 52 delega toda su lógica al módulo especializado.
     */
    const xmlObject =
        documentType === 52
            ? buildDte52XmlObject({
                  document,
                  items,
                  issuer,
                  folio,
                  emissionDate,
                  documentXmlId,
              })
            : {
                  DTE: {
                      '@xmlns': 'http://www.sii.cl/SiiDte',
                      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                      '@xsi:schemaLocation':
                          'http://www.sii.cl/SiiDte DTE_v10.xsd',
                      '@version': '1.0',

                      Documento: {
                          '@ID': documentXmlId,

                          Encabezado: {
                              IdDoc: {
                                  TipoDTE: documentType,

                                  Folio: folio,

                                  FchEmis: emissionDate,
                              },

                              Emisor: {
                                  RUTEmisor: normalizeRut(issuer.rut),

                                  RznSoc: issuer.razonSocial,

                                  GiroEmis: issuer.giro,

                                  ...(issuer.acteco
                                      ? {
                                            Acteco: issuer.acteco,
                                        }
                                      : {}),

                                  DirOrigen: issuer.direccion,

                                  CmnaOrigen: issuer.comuna,

                                  CiudadOrigen: issuer.ciudad,
                              },

                              Receptor: {
                                  RUTRecep: normalizeRut(document.receiver_rut),

                                  RznSocRecep: document.receiver_name,

                                  GiroRecep:
                                      document.receiver_giro ||
                                      'Sin giro informado',

                                  DirRecep:
                                      document.receiver_address ||
                                      'Sin dirección',

                                  CmnaRecep:
                                      document.receiver_comuna || 'Sin comuna',

                                  CiudadRecep:
                                      document.receiver_ciudad || 'Sin ciudad',
                              },

                              Totales: {
                                  MntNeto: toInteger(document.net_amount),

                                  TasaIVA: 19,

                                  IVA: toInteger(document.tax_amount),

                                  MntTotal: toInteger(document.total_amount),
                              },
                          },

                          Detalle: detalle33,
                      },
                  },
              }

    /**
     * Serializamos estructura base.
     */
    let xml = create(xmlObject).end({
        headless: false,

        prettyPrint: false,
    })

    /**
     * TED + TmstFirma.
     *
     * UNA SOLA VEZ.
     */
    const finalDocumentContent =
        ted.tedXml + `<TmstFirma>${signatureTimestamp}</TmstFirma>`

    xml = insertBeforeDocumentClose(xml, finalDocumentContent)

    /**
     * Validaciones defensivas.
     */
    const tedCount = (xml.match(/<TED\b/g) || []).length

    const timestampCount = (xml.match(/<TmstFirma>/g) || []).length

    if (tedCount !== 1) {
        throw new Error(`DTE inválido: se encontraron ${tedCount} nodos TED`)
    }

    if (timestampCount !== 1) {
        throw new Error(
            `DTE inválido: se encontraron ${timestampCount} nodos TmstFirma`,
        )
    }

    if (xml.includes('<TED_RAW>')) {
        throw new Error('DTE inválido: contiene TED_RAW')
    }

    if (xml.includes('&lt;TED')) {
        throw new Error('DTE inválido: TED fue escapado como texto')
    }

    /**
     * Escritura.
     */
    const outputDir = path.resolve(process.env.OUTPUT_XML_DIR || 'output/xml')

    await fs.mkdir(outputDir, {
        recursive: true,
    })

    const filename = `dte-${documentType}-${folio}.xml`

    const xmlPath = path.join(outputDir, filename)

    await fs.writeFile(xmlPath, xml, 'utf-8')

    /**
     * Actualizamos estado solamente
     * después de generar correctamente.
     */
    await document.update({
        xml_path: xmlPath,

        status: 'xml_generated',
    })

    return {
        document,
        xmlPath,
        xml,

        metadata: {
            documentXmlId,
            generatedAt: signatureTimestamp,
            tedCount,
            timestampCount,
        },
    }
}
