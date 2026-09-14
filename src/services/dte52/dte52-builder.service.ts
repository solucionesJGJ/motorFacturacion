import { buildDte52Detail } from './dte52-detail.service.js'

import { buildDte52Totals } from './dte52-totals.service.js'

import { buildDte52Transport } from './dte52-transport.service.js'

function normalizeRut(value: unknown) {
    const rut = String(value || '')
        .trim()
        .replace(/\./g, '')
        .replace(/\s/g, '')
        .toUpperCase()

    if (!/^\d{1,8}-[\dK]$/.test(rut)) {
        throw new Error(`RUT inválido para DTE 52: ${value}`)
    }

    return rut
}

type BuildDte52Context = {
    document: any
    items: any[]
    issuer: any
    folio: number
    emissionDate: string
    documentXmlId: string
}

export function buildDte52XmlObject(context: BuildDte52Context) {
    const { document, items, issuer, folio, emissionDate, documentXmlId } =
        context

    const transferIndicator = Number(document.dispatch_transfer_indicator)

    if (
        !Number.isInteger(transferIndicator) ||
        transferIndicator < 1 ||
        transferIndicator > 9
    ) {
        throw new Error('DTE 52: IndTraslado inválido o ausente')
    }

    const dispatchType =
        document.dispatch_type !== null && document.dispatch_type !== undefined
            ? Number(document.dispatch_type)
            : null

    return {
        DTE: {
            '@xmlns': 'http://www.sii.cl/SiiDte',

            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',

            '@xsi:schemaLocation': 'http://www.sii.cl/SiiDte DTE_v10.xsd',

            '@version': '1.0',

            Documento: {
                '@ID': documentXmlId,

                Encabezado: {
                    IdDoc: {
                        TipoDTE: 52,

                        Folio: folio,

                        FchEmis: emissionDate,

                        ...(dispatchType
                            ? {
                                  TipoDespacho: dispatchType,
                              }
                            : {}),

                        IndTraslado: transferIndicator,
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
                            document.receiver_giro || 'Sin giro informado',

                        DirRecep: document.receiver_address || 'Sin dirección',

                        CmnaRecep: document.receiver_comuna || 'Sin comuna',

                        CiudadRecep: document.receiver_ciudad || 'Sin ciudad',
                    },

                    Transporte: buildDte52Transport(document),

                    Totales: buildDte52Totals(document),
                },

                Detalle: buildDte52Detail(items, transferIndicator),
            },
        },
    }
}
