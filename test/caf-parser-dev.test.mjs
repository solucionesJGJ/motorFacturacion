import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
    parseCafXml,
} from '../dist/services/caf-parser.service.js'

test(
    'CAF DEV DTE 33 - parser obtiene autorización y llave privada',
    () => {
        const cafXml = fs.readFileSync(
            './dev/caf/CAF-DEV-DTE33-1-100.xml',
            'utf8',
        )

        const parsed = parseCafXml(cafXml)

        assert.equal(
            parsed.documentType,
            33,
        )

        assert.equal(
            parsed.folioFrom,
            1,
        )

        assert.equal(
            parsed.folioTo,
            100,
        )

        assert.ok(
            parsed.rutEmisor,
        )

        assert.ok(
            parsed.razonSocial,
        )

        assert.ok(
            parsed.privateKey,
        )

        assert.ok(
            parsed.privateKey.includes(
                'BEGIN RSA PRIVATE KEY',
            ),
        )

        assert.ok(
            parsed.publicKey,
        )

        assert.ok(
            parsed.cafXml.includes(
                '<CAF',
            ),
        )

        assert.ok(
            parsed.cafXml.includes(
                '</CAF>',
            ),
        )

        /**
         * La firma FRMA NO debe confundirse
         * con nuestra llave privada.
         */
        assert.equal(
            parsed.privateKey.includes(
                'DEV-CERTIFICATE-NOT-SII',
            ),
            false,
        )
    },
)