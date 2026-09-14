import 'dotenv/config'

import forge from 'node-forge'

import {
    BillingCaf,
    BillingDocument,
    sequelize,
} from '../src/models/index.js'

import {
    buildTed,
} from '../src/services/ted.service.js'

const DOCUMENT_ID =
    'a819330c-7afa-437f-9d0d-afd31595ae70'

async function main() {
    console.log('')
    console.log('SII 5044390-1 - VERIFY FRMT')
    console.log('────────────────────────────────')

    const document =
        await BillingDocument.findByPk(
            DOCUMENT_ID,
            {
                include: [
                    {
                        model: BillingCaf,
                        as: 'caf',
                    },
                ],
            },
        )

    if (!document) {
        throw new Error(
            'Documento no encontrado',
        )
    }

    const data =
        document.toJSON() as any

    const publicKeyPem =
        data.caf?.public_key

    if (!publicKeyPem) {
        throw new Error(
            'El CAF no tiene public_key',
        )
    }

    const {
        ddXml,
        frmt,
        tedXml,
    } = await buildTed(DOCUMENT_ID)

    if (
        tedXml.includes('&lt;DD&gt;')
    ) {
        throw new Error(
            'El TED todavía contiene DD escapado como texto',
        )
    }

    if (
        !tedXml.includes('<DD>')
    ) {
        throw new Error(
            'El TED no contiene nodo DD real',
        )
    }

    console.log(
        '✔ TED contiene nodo DD real',
    )

    const publicKey =
        forge.pki.publicKeyFromPem(
            publicKeyPem,
        )

    const md =
        forge.md.sha1.create()

    const binary =
        Buffer
            .from(
                ddXml,
                'latin1',
            )
            .toString(
                'binary',
            )

    md.update(binary)

    const signature =
        forge.util.decode64(frmt)

    const valid =
        publicKey.verify(
            md.digest().bytes(),
            signature,
        )

    console.log(
        `Verificación RSA FRMT: ${valid}`,
    )

    if (!valid) {
        throw new Error(
            'La firma FRMT no corresponde al DD y public_key del CAF DEV',
        )
    }

    console.log('')
    console.log(
        '✔ FRMT verificado criptográficamente',
    )

    console.log(
        '✔ private_key y public_key pertenecen al mismo par RSA',
    )

    console.log(
        '✔ El DD firmado coincide con el FRMT generado',
    )
}

main()
    .catch((error) => {
        console.error('')
        console.error(
            'ERROR VERIFY FRMT:',
            error,
        )

        process.exitCode = 1
    })
    .finally(async () => {
        await sequelize.close()
    })