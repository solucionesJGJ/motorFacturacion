import fs from 'fs/promises'

export async function extractTedFromXmlFile(xmlPath: string) {
    const xml = await fs.readFile(xmlPath, 'utf-8')

    const tedMatch = xml.match(/<TED\b[\s\S]*?<\/TED>/)

    if (!tedMatch) {
        throw new Error('El XML no contiene TED')
    }

    const tedXml = tedMatch[0]

    const ddMatch = tedXml.match(/<DD>[\s\S]*?<\/DD>/)

    const cafMatch = tedXml.match(/<CAF\b[\s\S]*?<\/CAF>/)

    const frmtMatch = tedXml.match(/<FRMT\b[^>]*>([\s\S]*?)<\/FRMT>/)

    const ddXml = ddMatch?.[0] || ''

    const cafXml = cafMatch?.[0] || ''

    const frmt = frmtMatch?.[1]?.trim() || ''

    return tedXml
}
