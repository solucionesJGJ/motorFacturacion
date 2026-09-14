import { XMLParser } from 'fast-xml-parser'

export type ParsedCaf = {
    rutEmisor: string
    razonSocial: string
    documentType: number
    folioFrom: number
    folioTo: number
    authorizationDate?: string | null
    privateKey?: string | null
    publicKey?: string | null
    cafXml: string
}

function getNodeText(value: unknown): string | null {
    if (!value) return null

    if (typeof value === 'string') {
        return value.trim()
    }

    if (typeof value === 'number') {
        return String(value)
    }

    if (typeof value === 'object' && '#text' in value) {
        const text = (value as { '#text'?: unknown })['#text']

        return text ? String(text).trim() : null
    }

    return null
}

function extractCafNode(cafXml: string): string {
    const match = cafXml.match(/<CAF\b[\s\S]*?<\/CAF>/)

    if (!match) {
        throw new Error(
            'CAF invalido: no se encontro nodo <CAF> dentro de AUTORIZACION',
        )
    }

    return match[0]
}

export function parseCafXml(cafXml: string): ParsedCaf {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        trimValues: true,
    })

    const parsed = parser.parse(cafXml)

    const authorization = parsed?.AUTORIZACION
    const caf = authorization?.CAF
    const da = caf?.DA

    if (!authorization) {
        throw new Error('CAF invalido: no se encontro nodo AUTORIZACION')
    }

    if (!caf) {
        throw new Error('CAF invalido: no se encontro nodo AUTORIZACION.CAF')
    }

    if (!da) {
        throw new Error('CAF invalido: no se encontro AUTORIZACION.CAF.DA')
    }

    const rutEmisor = getNodeText(da.RE)
    const razonSocial = getNodeText(da.RS)

    const documentType = Number(getNodeText(da.TD))

    const folioFrom = Number(getNodeText(da.RNG?.D))

    const folioTo = Number(getNodeText(da.RNG?.H))

    const authorizationDate = getNodeText(da.FA)

    /**
     * IMPORTANTE
     *
     * FRMA dentro de <CAF> NO es la llave privada.
     *
     * La llave privada entregada por SII está en:
     *
     * AUTORIZACION.RSASK
     *
     * y la pública en:
     *
     * AUTORIZACION.RSAPUBK
     */
    const privateKey = getNodeText(authorization.RSASK)

    const publicKey = getNodeText(authorization.RSAPUBK)

    if (!rutEmisor) {
        throw new Error('CAF invalido: no contiene RUT emisor')
    }

    if (!razonSocial) {
        throw new Error('CAF invalido: no contiene razon social')
    }

    if (!Number.isInteger(documentType) || documentType <= 0) {
        throw new Error('CAF invalido: tipo de documento no valido')
    }

    if (
        !Number.isInteger(folioFrom) ||
        !Number.isInteger(folioTo) ||
        folioFrom <= 0 ||
        folioTo < folioFrom
    ) {
        throw new Error('CAF invalido: rango de folios no valido')
    }

    if (!privateKey) {
        throw new Error('CAF invalido: no contiene llave privada RSASK')
    }

    return {
        rutEmisor,
        razonSocial,
        documentType,
        folioFrom,
        folioTo,
        authorizationDate,
        privateKey,
        publicKey,
        cafXml: extractCafNode(cafXml),
    }
}
