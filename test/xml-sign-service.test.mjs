import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { signXmlFile } from '../dist/services/xml-sign.service.js'

function restoreEnv(name, value) {
    if (value === undefined) {
        delete process.env[name]
        return
    }

    process.env[name] = value
}

test('requires signing key and certificate paths', async () => {
    const previousPrivateKeyPath = process.env.SIGN_PRIVATE_KEY_PATH
    const previousCertificatePath = process.env.SIGN_CERTIFICATE_PATH
    delete process.env.SIGN_PRIVATE_KEY_PATH
    delete process.env.SIGN_CERTIFICATE_PATH

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xml-sign-'))
    const xmlPath = path.join(dir, 'dte.xml')

    await fs.writeFile(
        xmlPath,
        '<DTE><Documento ID="F33T1"><Encabezado /></Documento></DTE>',
        'utf-8',
    )

    await assert.rejects(
        () => signXmlFile(xmlPath),
        /SIGN_PRIVATE_KEY_PATH y SIGN_CERTIFICATE_PATH/,
    )

    restoreEnv('SIGN_PRIVATE_KEY_PATH', previousPrivateKeyPath)
    restoreEnv('SIGN_CERTIFICATE_PATH', previousCertificatePath)
})
