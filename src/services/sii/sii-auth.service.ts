import { SignedXml } from 'xml-crypto'
import { DOMParser } from '@xmldom/xmldom'

import { loadPfxCertificate } from '../certificate.service.js'

const CERT_BASE =
    process.env.SII_AUTH_BASE_URL || 'https://maullin.sii.cl/DTEWS'

const CR_SEED_URL = `${CERT_BASE}/CrSeed.jws`

const GET_TOKEN_URL = `${CERT_BASE}/GetTokenFromSeed.jws`

function escapeXml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function extractSoapReturn(soapXml: string): string {
    const document = new DOMParser().parseFromString(soapXml, 'text/xml')

    const allNodes = document.getElementsByTagName('*')

    for (let i = 0; i < allNodes.length; i++) {
        const node = allNodes.item(i)

        if (!node) {
            continue
        }

        const localName = node.localName || node.nodeName.split(':').pop()

        if (localName === 'getSeedReturn' || localName === 'getTokenReturn') {
            return (node.textContent || '').trim()
        }
    }

    throw new Error('Respuesta SOAP SII sin valor de retorno')
}

function decodeXmlEntities(value: string) {
    return value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
}

function extractTag(xml: string, tag: string) {
    const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'))

    return match ? match[1].trim() : null
}

async function postSoap(url: string, body: string) {
    const response = await fetch(url, {
        method: 'POST',

        headers: {
            'Content-Type': 'text/xml; charset=utf-8',

            SOAPAction: '""',
        },

        body,
    })

    const text = await response.text()

    if (!response.ok) {
        throw new Error(`SII HTTP ${response.status}: ${text}`)
    }

    return text
}

async function getSeed() {
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
    <SOAP-ENV:Body>
        <m:getSeed xmlns:m="${CR_SEED_URL}"/>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

    const response = await postSoap(CR_SEED_URL, soap)

    const returned = extractSoapReturn(response)

    const decoded = decodeXmlEntities(returned)

    const seed = extractTag(decoded, 'SEMILLA')

    if (!seed) {
        throw new Error(`SII no devolvió SEMILLA: ${decoded}`)
    }

    return seed
}

async function signSeed(seed: string) {
    const certificate = await loadPfxCertificate()

    const xml = [
        '<getToken>',
        '<item>',
        `<Semilla>${escapeXml(seed)}</Semilla>`,
        '</item>',
        '</getToken>',
    ].join('')

    const sig = new SignedXml()

    sig.privateKey = certificate.privateKeyPem

    sig.publicCert = certificate.certificatePem

    sig.addReference({
        xpath: "//*[local-name(.)='getToken']",

        transforms: ['http://www.w3.org/TR/2001/REC-xml-c14n-20010315'],

        digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    })

    sig.canonicalizationAlgorithm =
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'

    sig.signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'

    sig.computeSignature(xml, {
        location: {
            reference: "//*[local-name(.)='getToken']",

            action: 'append',
        },
    })

    return sig.getSignedXml()
}

async function requestToken(signedSeed: string) {
    const escapedSignedSeed = escapeXml(signedSeed)

    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
    <SOAP-ENV:Body>
        <m:getToken xmlns:m="${GET_TOKEN_URL}">
            <pszXml xsi:type="xsd:string">${escapedSignedSeed}</pszXml>
        </m:getToken>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

    const response = await postSoap(GET_TOKEN_URL, soap)

    const returned = extractSoapReturn(response)

    const decoded = decodeXmlEntities(returned)

    const estado = extractTag(decoded, 'ESTADO')

    const glosa = extractTag(decoded, 'GLOSA')

    const token = extractTag(decoded, 'TOKEN')

    if (estado !== '00' || !token) {
        throw new Error(
            `SII rechazó autenticación. ESTADO=${estado ?? 'N/A'} GLOSA=${glosa ?? 'N/A'}`,
        )
    }

    return token
}

async function getRealSiiAuthToken() {
    const seed = await getSeed()

    const signedSeed = await signSeed(seed)

    const token = await requestToken(signedSeed)

    return token
}

export async function getSiiAuthToken() {
    const mode = process.env.SII_MODE || 'mock'

    if (mode === 'mock') {
        return 'mock-sii-token'
    }

    if (mode === 'certification') {
        return getRealSiiAuthToken()
    }

    throw new Error(`SII_MODE no soportado: ${mode}`)
}
