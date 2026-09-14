import forge from 'node-forge'

import {
    getIssuerConfig,
} from '../src/config/issuer.config.js'

import {
    importCafXml,
} from '../src/services/caf-import.service.js'

function toBase64BigInteger(
    value: forge.jsbn.BigInteger,
) {
    let hex = value.toString(16)

    if (hex.length % 2 !== 0) {
        hex = `0${hex}`
    }

    return Buffer
        .from(
            hex,
            'hex',
        )
        .toString(
            'base64',
        )
}

async function main() {
    const issuer =
        getIssuerConfig()

    const documentType =
        52

    const folioFrom =
        1

    const folioTo =
        100

    const authorizationDate =
        new Date()
            .toISOString()
            .slice(0, 10)

    const keyPair =
        forge.pki.rsa.generateKeyPair({
            bits: 2048,
            e: 0x10001,
        })

    const privateKeyPem =
        forge.pki.privateKeyToPem(
            keyPair.privateKey,
        )

    const publicKeyPem =
        forge.pki.publicKeyToPem(
            keyPair.publicKey,
        )

    const modulusBase64 =
        toBase64BigInteger(
            keyPair.publicKey.n,
        )

    const exponentBase64 =
        toBase64BigInteger(
            keyPair.publicKey.e,
        )

    const cafXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<AUTORIZACION>
    <CAF version="1.0">
        <DA>
            <RE>${issuer.rut}</RE>
            <RS>${issuer.razonSocial}</RS>
            <TD>${documentType}</TD>
            <RNG>
                <D>${folioFrom}</D>
                <H>${folioTo}</H>
            </RNG>
            <FA>${authorizationDate}</FA>
            <RSAPK>
                <M>${modulusBase64}</M>
                <E>${exponentBase64}</E>
            </RSAPK>
            <IDK>999</IDK>
        </DA>
        <FRMA algoritmo="SHA1withRSA">DEV-CAF52-MOCK-NOT-SII</FRMA>
    </CAF>
    <RSASK>${privateKeyPem}</RSASK>
    <RSAPUBK>${publicKeyPem}</RSAPUBK>
</AUTORIZACION>`

    const result =
        await importCafXml(
            cafXml,
        )

    console.log(
        JSON.stringify(
            {
                ok: true,
                created:
                    result.created,

                caf: {
                    id:
                        result.caf.id,

                    document_type:
                        result.caf.document_type,

                    issuer_rut:
                        result.caf.issuer_rut,

                    folio_from:
                        result.caf.folio_from,

                    folio_to:
                        result.caf.folio_to,

                    active:
                        result.caf.active,
                },

                sequence:
                    result.sequence
                        ? {
                            id:
                                result.sequence.id,

                            document_type:
                                result.sequence.document_type,

                            current_folio:
                                result.sequence.current_folio,

                            folio_from:
                                result.sequence.folio_from,

                            folio_to:
                                result.sequence.folio_to,

                            active:
                                result.sequence.active,
                        }
                        : null,
            },
            null,
            2,
        ),
    )
}

main()
    .then(
        () => {
            process.exit(0)
        },
    )
    .catch(
        (
            error,
        ) => {
            console.error(
                'No fue posible crear/importar CAF52 mock:',
                error,
            )

            process.exit(1)
        },
    )
