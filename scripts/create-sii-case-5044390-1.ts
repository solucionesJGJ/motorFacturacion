import 'dotenv/config'

import {
    sequelize,
    BillingDocument,
    BillingDocumentItem,
    BillingCaf,
} from '../src/models/index.js'

import {
    validateBillingInput,
} from '../src/services/billing-validator.service.js'

import {
    normalizeBillingInput,
} from '../src/services/billing-normalizer.service.js'

import {
    createBillingDocument,
} from '../src/services/billing-document.service.js'

const input = {
    documentType: 33,

    receiver: {
        rut: '60803000-K',
        razonSocial: 'RECEPTOR CERTIFICACION DEV',
        giro: 'SERVICIOS',
        address: 'DIRECCION DEV',
        comuna: 'SANTIAGO',
        ciudad: 'SANTIAGO',
    },

    items: [
        {
            description: 'Cajón',
            quantity: 134,
            unitPrice: 1540,
        },
        {
            description: 'Relleno',
            quantity: 57,
            unitPrice: 2517,
        },
    ],
}

async function main() {
    console.log('')
    console.log('SII 5044390-1')
    console.log('Creando documento DEV...')
    console.log('')

    /**
     * 1. Validación de entrada.
     */
    const validation =
        validateBillingInput(input)

    if (!validation.valid) {
        console.error(
            'Entrada inválida:',
            validation.errors,
        )

        throw new Error(
            'El caso 5044390-1 no pasó validación',
        )
    }

    console.log('✔ Validación correcta')

    /**
     * 2. Normalización y cálculo.
     */
    const normalized =
        normalizeBillingInput(input)

    console.log('')
    console.log('Totales calculados:')
    console.log(
        `Neto  = ${normalized.netAmount}`,
    )
    console.log(
        `IVA   = ${normalized.taxAmount}`,
    )
    console.log(
        `Total = ${normalized.totalAmount}`,
    )

    /**
     * Control del caso oficial.
     */
    if (normalized.netAmount !== 349829) {
        throw new Error(
            `Neto incorrecto: ${normalized.netAmount}`,
        )
    }

    if (normalized.taxAmount !== 66468) {
        throw new Error(
            `IVA incorrecto: ${normalized.taxAmount}`,
        )
    }

    if (normalized.totalAmount !== 416297) {
        throw new Error(
            `Total incorrecto: ${normalized.totalAmount}`,
        )
    }

    console.log('')
    console.log('✔ Totales 5044390-1 correctos')

    /**
     * 3. Creación real del BillingDocument.
     *
     * NO enviamos folio.
     * createBillingDocument debe obtenerlo
     * automáticamente desde el CAF.
     */
    const document =
        await createBillingDocument(
            normalized,
            {
                sourceType:
                    'sii-certification-dev',

                externalProvider:
                    'sii-certification',

                externalOrderId:
                    '5044390-1',

                externalPaymentId:
                    `5044390-1-${Date.now()}`,
            },
        )

    if (!document) {
        throw new Error(
            'No se creó BillingDocument',
        )
    }

    /**
     * Recargamos con items + CAF
     * para inspeccionar el resultado real.
     */
    const saved =
        await BillingDocument.findByPk(
            document.id,
            {
                include: [
                    {
                        model:
                            BillingDocumentItem,

                        as:
                            'items',
                    },
                    {
                        model:
                            BillingCaf,

                        as:
                            'caf',
                    },
                ],
            },
        )

    if (!saved) {
        throw new Error(
            'No se pudo recuperar el documento creado',
        )
    }

    const data =
        saved.toJSON() as any

    console.log('')
    console.log('DOCUMENTO CREADO')
    console.log('────────────────────────')

    console.log(
        `ID       : ${data.id}`,
    )

    console.log(
        `Tipo DTE : ${data.document_type}`,
    )

    console.log(
        `Folio    : ${data.folio}`,
    )

    console.log(
        `CAF ID   : ${data.caf_id}`,
    )

    console.log(
        `Estado   : ${data.status}`,
    )

    console.log('')
    console.log('TOTALES')
    console.log('────────────────────────')

    console.log(
        `Neto     : ${data.net_amount}`,
    )

    console.log(
        `IVA      : ${data.tax_amount}`,
    )

    console.log(
        `Total    : ${data.total_amount}`,
    )

    console.log('')
    console.log('DETALLE')
    console.log('────────────────────────')

    console.table(
        data.items.map((item: any) => ({
            linea:
                item.line_number,

            descripcion:
                item.description,

            cantidad:
                Number(item.quantity),

            precio:
                Number(item.unit_price),

            neto:
                Number(item.net_amount),

            iva:
                Number(item.tax_amount),

            total:
                Number(item.total_amount),
        })),
    )

    console.log('')
    console.log('CAF')
    console.log('────────────────────────')

    console.log(
        `Rango: ${data.caf?.folio_from} - ${data.caf?.folio_to}`,
    )

    console.log('')
    console.log(
        '✔ 5044390-1 persistido correctamente',
    )
}

main()
    .catch((error) => {
        console.error('')
        console.error(
            'ERROR 5044390-1:',
            error,
        )

        process.exitCode = 1
    })
    .finally(async () => {
        await sequelize.close()
    })