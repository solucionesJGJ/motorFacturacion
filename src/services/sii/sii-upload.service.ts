import fs from 'node:fs'
import path from 'node:path'

import type { SiiUploadResult } from './sii-types.js'

const CERT_UPLOAD_URL =
    process.env.SII_UPLOAD_URL || 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload'

function normalizeRut(rut: string) {
    return rut.replace(/\./g, '').replace(/\s/g, '').toUpperCase()
}

function splitRut(rut: string) {
    const normalized = normalizeRut(rut)

    const match = normalized.match(/^(\d+)-([0-9K])$/)

    if (!match) {
        throw new Error(`RUT inválido: ${rut}`)
    }

    return {
        number: match[1],
        dv: match[2],
    }
}

function extractTag(xml: string, tag: string) {
    const match = xml.match(
        new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`, 'i'),
    )

    return match ? match[1].trim() : null
}

async function uploadRealEnvelope(
    signedEnvelopePath: string,
    authToken: string,
): Promise<SiiUploadResult> {
    if (!fs.existsSync(signedEnvelopePath)) {
        throw new Error(`EnvioDTE no existe: ${signedEnvelopePath}`)
    }

    if (!authToken) {
        throw new Error('TOKEN SII vacío')
    }

    const senderRut = process.env.SII_RUT_ENVIA

    const companyRut = process.env.ISSUER_RUT

    if (!senderRut) {
        throw new Error('Falta SII_RUT_ENVIA')
    }

    if (!companyRut) {
        throw new Error('Falta ISSUER_RUT')
    }

    const sender = splitRut(senderRut)

    const company = splitRut(companyRut)

    /*
     * Importante:
     * mantenemos los bytes originales
     * ISO-8859-1 del EnvioDTE.
     */
    const xmlBuffer = fs.readFileSync(signedEnvelopePath)

    const fileName = path.basename(signedEnvelopePath)

    const form = new FormData()

    form.append('rutSender', sender.number)

    form.append('dvSender', sender.dv)

    form.append('rutCompany', company.number)

    form.append('dvCompany', company.dv)

    form.append(
        'archivo',
        new Blob([xmlBuffer], {
            type: 'text/xml',
        }),
        fileName,
    )

    const response = await fetch(CERT_UPLOAD_URL, {
        method: 'POST',

        headers: {
            Cookie: `TOKEN=${authToken}`,
        },

        body: form,
    })

    const raw = await response.text()

    if (!response.ok) {
        throw new Error(`SII Upload HTTP ${response.status}: ${raw}`)
    }

    const status = extractTag(raw, 'STATUS')

    const trackId = extractTag(raw, 'TRACKID')

    if (status !== '0') {
        throw new Error(
            `SII rechazó upload. STATUS=${status ?? 'N/A'} RESPONSE=${raw}`,
        )
    }

    if (!trackId) {
        throw new Error(`SII recibió upload pero no devolvió TRACKID: ${raw}`)
    }

    return {
        trackId,

        rawResponse: {
            status,
            trackId,
            response: raw,
        },
    }
}

export async function uploadSiiEnvelope(
    signedEnvelopePath: string,
    authToken: string,
): Promise<SiiUploadResult> {
    const mode = process.env.SII_MODE || 'mock'

    if (mode === 'mock') {
        return {
            trackId: `MOCK-${Date.now()}`,

            rawResponse: {
                mode,
                signedEnvelopePath,
                received: true,
            },
        }
    }

    if (mode === 'certification') {
        return uploadRealEnvelope(signedEnvelopePath, authToken)
    }

    throw new Error(`SII_MODE no soportado: ${mode}`)
}
