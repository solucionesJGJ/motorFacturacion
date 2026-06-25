import forge from 'node-forge'
import { create } from 'xmlbuilder2'
import {
    BillingCaf,
    BillingDocument,
    BillingDocumentItem,
} from '../models/index.js'

function toInteger(value: unknown) {
    return Math.round(Number(value || 0))
}

function formatDate(date = new Date()) {
    return date.toISOString().slice(0, 10)
}

function getFirstItemName(items: any[]) {
    return items[0]?.description || 'ITEM'
}

function cleanXmlForSignature(xml: string) {
    return xml
        .replace(/\r?\n|\r/g, '')
        .replace(/>\s+</g, '><')
        .trim()
}

export async function buildTed(documentId: string) {
    const document = await BillingDocument.findByPk(documentId, {
        include: [
            { model: BillingDocumentItem, as: 'items' },
            { model: BillingCaf, as: 'caf' },
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

    const items = docJson.items || []
    const firstItemName = getFirstItemName(items)

    const ddObject = {
        DD: {
            RE: caf.issuer_rut,
            TD: Number(document.document_type),
            F: Number(document.folio),
            FE: formatDate(),
            RR: document.receiver_rut,
            RSR: document.receiver_name,
            MNT: toInteger(document.total_amount),
            IT1: firstItemName.substring(0, 40),
            CAF: caf.caf_xml.includes('<CAF')
                ? undefined
                : undefined,
            TSTED: new Date().toISOString().slice(0, 19),
        },
    }

    const ddXmlWithoutCaf = create(ddObject).end({
        headless: true,
        prettyPrint: false,
    })

    /**
     * Para versión inicial insertamos el CAF XML completo dentro del DD
     * de forma controlada. Luego refinamos extracción exacta de <CAF>.
     */
    const ddXml = ddXmlWithoutCaf.replace(
        '<TSTED>',
        `${extractCafNode(caf.caf_xml)}<TSTED>`,
    )

    const frmt = signTedDd(ddXml, caf.private_key)

    const tedXml = create({
        TED: {
            '@version': '1.0',
            '#': `${ddXml}<FRMT algoritmo="SHA1withRSA">${frmt}</FRMT>`,
        },
    }).end({
        headless: true,
        prettyPrint: false,
    })

    return {
        ddXml,
        frmt,
        tedXml,
    }
}

function extractCafNode(cafXml: string) {
    const match = cafXml.match(/<CAF[\s\S]*<\/CAF>/)

    if (!match) {
        throw new Error('No se encontró nodo <CAF> dentro del caf_xml')
    }

    return match[0]
}

function signTedDd(ddXml: string, privateKeyPem?: string | null) {
    if (!privateKeyPem) {
        /**
         * Modo demo: no firma real.
         * Para producción debe venir la llave privada RSA asociada al CAF.
         */
        return 'FRMT_DEMO_PENDIENTE_LLAVE_PRIVADA'
    }

    const normalized = cleanXmlForSignature(ddXml)

    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
    const md = forge.md.sha1.create()

    md.update(normalized, 'utf8')

    const signature = privateKey.sign(md)

    return forge.util.encode64(signature)
}