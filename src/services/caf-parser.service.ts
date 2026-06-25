import { XMLParser } from 'fast-xml-parser'

export type ParsedCaf = {
    rutEmisor: string
    razonSocial: string
    documentType: number
    folioFrom: number
    folioTo: number
    authorizationDate?: string | null
    privateKey?: string | null
}

function getNodeText(value: unknown): string | null {
    if (!value) return null
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (typeof value === 'object' && '#text' in value) {
        const text = (value as { '#text'?: unknown })['#text']
        return text ? String(text) : null
    }

    return null
}

export function parseCafXml(cafXml: string): ParsedCaf {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
    })

    const parsed = parser.parse(cafXml)

    const caf = parsed?.AUTORIZACION?.CAF
    const da = caf?.DA

    if (!da) {
        throw new Error('CAF invalido: no se encontro AUTORIZACION.CAF.DA')
    }

    return {
        rutEmisor: da.RE,
        razonSocial: da.RS,
        documentType: Number(da.TD),
        folioFrom: Number(da.RNG?.D),
        folioTo: Number(da.RNG?.H),
        authorizationDate: da.FA || null,
        privateKey: getNodeText(caf?.FRMA),
    }
}
