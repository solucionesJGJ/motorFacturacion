import fs from 'fs/promises'

export async function extractTedFromXmlFile(xmlPath: string) {
    const xml = await fs.readFile(xmlPath, 'utf-8')

    const match = xml.match(/<TED[\s\S]*?<\/TED>/)

    if (!match) {
        throw new Error('El XML no contiene TED')
    }

    return match[0]
}