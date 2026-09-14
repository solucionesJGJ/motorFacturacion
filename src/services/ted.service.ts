import forge from 'node-forge'

import {
    BillingCaf,
    BillingDocument,
    BillingDocumentItem,
} from '../models/index.js'

function toInteger(value: unknown) {
    return Math.round(Number(value || 0))
}

function formatDate(date: Date) {
    return date.toISOString().slice(0, 10)
}

function formatTimestamp(date: Date) {
    return date.toISOString().slice(0, 19)
}

/**
 * Formato requerido por SII:
 *
 * XXXXXXXX-X
 *
 * Ej:
 * 60.803.000-K
 * ->
 * 60803000-K
 */
function normalizeRut(value: unknown) {
    const rut = String(value || '')
        .trim()
        .replace(/\./g, '')
        .replace(/\s/g, '')
        .toUpperCase()

    if (!/^\d{1,8}-[\dK]$/.test(rut)) {
        throw new Error(`RUT inválido para TED: ${value}`)
    }

    return rut
}

/**
 * Escapa texto para XML sin modificar
 * caracteres válidos ISO-8859-1.
 */
function escapeXmlText(value: unknown) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

/**
 * El TED del SII trabaja con
 * ISO-8859-1.
 *
 * Bloqueamos cualquier carácter que
 * no pueda representarse en Latin-1.
 */
function assertIso88591(value: string, fieldName: string) {
    for (let i = 0; i < value.length; i++) {
        if (value.charCodeAt(i) > 255) {
            throw new Error(
                `${fieldName} contiene un carácter fuera de ISO-8859-1: ${value[i]}`,
            )
        }
    }
}

function getFirstItemName(items: any[]) {
    const value = String(items[0]?.description || 'ITEM')

    /**
     * SII:
     * IT1 máximo 40 caracteres.
     */
    return value.substring(0, 40)
}

/**
 * Extrae exactamente el nodo CAF.
 *
 * Usamos expresión NO greedy para evitar
 * capturar contenido posterior por error.
 */
function extractCafNode(cafXml: string) {
    const match = cafXml.match(/<CAF\b[\s\S]*?<\/CAF>/)

    if (!match) {
        throw new Error('No se encontró nodo <CAF> dentro de caf_xml')
    }

    /*
     * Compactamos únicamente el whitespace
     * existente ENTRE etiquetas XML.
     *
     * No modificamos contenido interno
     * de M, E, FRMA, etc.
     *
     * Esta compactación ocurre ANTES
     * de construir y firmar DD.
     */

    return match[0].replace(/>\s+</g, '><').trim()
}

/**
 * Convierte el string a los bytes
 * ISO-8859-1 que serán firmados.
 */
function toLatin1Binary(value: string) {
    assertIso88591(value, 'DD')

    return Buffer.from(value, 'latin1').toString('binary')
}

/**
 * Firma EXACTAMENTE el DD recibido.
 *
 * No se eliminan espacios.
 * No se cambian saltos.
 * No se reconstruye.
 */
function signTedDd(ddXml: string, privateKeyPem: string | null | undefined) {
    if (!privateKeyPem) {
        throw new Error('El CAF no contiene llave privada para generar FRMT')
    }

    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)

    const md = forge.md.sha1.create()

    const binary = toLatin1Binary(ddXml)

    md.update(binary)

    const signature = privateKey.sign(md)

    return forge.util.encode64(signature)
}

export async function buildTed(documentId: string, generatedAt = new Date()) {
    const document = await BillingDocument.findByPk(documentId, {
        include: [
            {
                model: BillingDocumentItem,

                as: 'items',
            },

            {
                model: BillingCaf,

                as: 'caf',
            },
        ],
    })

    if (!document) {
        throw new Error('Documento no encontrado')
    }

    const docJson = document.toJSON() as any

    const caf = docJson.caf

    if (!caf) {
        throw new Error('El documento no tiene CAF asociado')
    }

    if (!document.folio) {
        throw new Error('El documento no tiene folio')
    }

    const items = docJson.items || []

    if (items.length === 0) {
        throw new Error('El documento no contiene items')
    }

    /**
     * Datos SII
     */
    const issuerRut = normalizeRut(caf.issuer_rut)

    const receiverRut = normalizeRut(document.receiver_rut)

    const receiverName = String(document.receiver_name || '').substring(0, 40)

    const firstItemName = getFirstItemName(items)

    assertIso88591(receiverName, 'RSR')

    assertIso88591(firstItemName, 'IT1')

    const total = toInteger(document.total_amount)

    const cafXml = extractCafNode(caf.caf_xml)

    /**
     * Usamos UN MISMO instante para:
     *
     * FE
     * TSTED
     *
     * Así evitamos diferencias absurdas
     * por cruzar de segundo/día durante
     * la generación.
     */
    const emissionDate = formatDate(generatedAt)

    const timestamp = formatTimestamp(generatedAt)

    /**
     * Construimos explícitamente el DD.
     *
     * Este string será:
     *
     * 1. firmado
     * 2. insertado dentro del TED
     *
     * EXACTAMENTE igual.
     */
    const ddXml =
        '<DD>' +
        `<RE>${escapeXmlText(issuerRut)}</RE>` +
        `<TD>${Number(document.document_type)}</TD>` +
        `<F>${Number(document.folio)}</F>` +
        `<FE>${emissionDate}</FE>` +
        `<RR>${escapeXmlText(receiverRut)}</RR>` +
        `<RSR>${escapeXmlText(receiverName)}</RSR>` +
        `<MNT>${total}</MNT>` +
        `<IT1>${escapeXmlText(firstItemName)}</IT1>` +
        cafXml +
        `<TSTED>${timestamp}</TSTED>` +
        '</DD>'

    /**
     * Firma SHA1 + RSA del DD.
     */
    const frmt = signTedDd(ddXml, caf.private_key)

    /**
     * TED final.
     */
    const tedXml =
        '<TED version="1.0">' +
        ddXml +
        `<FRMT algoritmo="SHA1withRSA">${frmt}</FRMT>` +
        '</TED>'

    return {
        ddXml,
        frmt,
        tedXml,
        generatedAt: timestamp,
    }
}
