import type { NormalizedBillingDocument } from '../types/normalized-billing.types.js'

import {
    BillingDocument,
    BillingDocumentItem,
    sequelize,
} from '../models/index.js'

import { assignNextFolio } from './folio.service.js'

type CreateBillingDocumentOptions = {
    sourceType: string

    sourceFilename?: string | null

    externalProvider?: string | null

    externalOrderId?: string | null

    externalPaymentId?: string | null
}

export async function createBillingDocument(
    document: NormalizedBillingDocument,

    options: CreateBillingDocumentOptions,
) {
    return sequelize.transaction(async (transaction) => {
        /**
         * ==============================================
         * IDEMPOTENCIA
         * ==============================================
         *
         * Si un proveedor externo manda nuevamente
         * el mismo externalOrderId, devolvemos el
         * documento existente.
         *
         * MUY IMPORTANTE:
         * esto ocurre ANTES de asignar un nuevo folio.
         */

        if (options.externalProvider && options.externalOrderId) {
            const existingDocument = await BillingDocument.findOne({
                where: {
                    external_provider: options.externalProvider,

                    external_order_id: options.externalOrderId,
                },

                include: [
                    {
                        model: BillingDocumentItem,

                        as: 'items',
                    },
                ],

                transaction,
            })

            if (existingDocument) {
                return existingDocument
            }
        }

        /**
         * ==============================================
         * ASIGNACIÓN DE FOLIO
         * ==============================================
         */

        const assignedFolio = document.folio
            ? {
                  folio: document.folio,

                  cafId: null,
              }
            : await assignNextFolio(document.documentType, transaction)

        /**
         * ==============================================
         * CABECERA
         * ==============================================
         */

        const billingDocument = await BillingDocument.create(
            {
                source_type: options.sourceType,

                source_filename: options.sourceFilename || null,

                external_provider: options.externalProvider || null,

                external_order_id: options.externalOrderId || null,

                external_payment_id: options.externalPaymentId || null,

                document_type: document.documentType,

                folio: assignedFolio.folio,

                caf_id: assignedFolio.cafId,

                receiver_rut: document.receiverRut,

                receiver_name: document.receiverName,

                receiver_giro: document.receiverGiro || null,

                receiver_address: document.receiverAddress || null,

                receiver_comuna: document.receiverComuna || null,

                receiver_ciudad: document.receiverCiudad || null,

                /**
                 * ======================================
                 * DTE 52 - PERSISTENCIA DE DESPACHO
                 * ======================================
                 *
                 * Para DTE 33 document.dispatch es null,
                 * por lo que estos campos quedan NULL.
                 */
                dispatch_transfer_indicator:
                    document.dispatch?.transferIndicator ?? null,

                dispatch_type: document.dispatch?.dispatchType ?? null,

                dispatch_vehicle_plate: document.dispatch?.vehiclePlate ?? null,

                dispatch_carrier_rut: document.dispatch?.carrierRut ?? null,

                dispatch_driver_rut: document.dispatch?.driverRut ?? null,

                dispatch_driver_name: document.dispatch?.driverName ?? null,

                dispatch_destination_address:
                    document.dispatch?.destinationAddress ?? null,

                dispatch_destination_commune:
                    document.dispatch?.destinationCommune ?? null,

                dispatch_destination_city:
                    document.dispatch?.destinationCity ?? null,

                dispatch_departure_date:
                    document.dispatch?.departureDate ?? null,

                dispatch_departure_time:
                    document.dispatch?.departureTime ?? null,

                dispatch_arrival_date: document.dispatch?.arrivalDate ?? null,

                net_amount: document.netAmount,

                tax_amount: document.taxAmount,

                total_amount: document.totalAmount,

                status: 'validated',

                sii_track_id: null,

                xml_path: null,

                pdf_path: null,

                error_message: null,
            },
            {
                transaction,
            },
        )

        /**
         * ==============================================
         * ITEMS
         * ==============================================
         */

        await BillingDocumentItem.bulkCreate(
            document.items.map((item) => ({
                billing_document_id: billingDocument.id,

                line_number: item.lineNumber,

                description: item.description,

                quantity: item.quantity,

                unit_price: item.unitPrice,

                discount_percentage: item.discountPercentage,

                discount_amount: item.discountAmount,

                net_amount: item.netAmount,

                tax_amount: item.taxAmount,

                total_amount: item.totalAmount,
            })),
            {
                transaction,
            },
        )

        /**
         * ==============================================
         * RESPUESTA
         * ==============================================
         */

        return BillingDocument.findByPk(billingDocument.id, {
            include: [
                {
                    model: BillingDocumentItem,

                    as: 'items',
                },
            ],

            transaction,
        })
    })
}
