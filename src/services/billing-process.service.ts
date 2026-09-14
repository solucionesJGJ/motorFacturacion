import {
    BillingDocument,
    BillingDocumentItem,
    BillingSiiSubmission,
    BillingSiiSubmissionDocument,
    sequelize,
} from '../models/index.js'

import { generateDteXml } from './dte-xml.services.js'

import { signXmlFile } from './xml-sign.service.js'

import { generateEnvioDteXml } from './envio-dte.service.js'

import { signEnvioDteFile } from './envio-dte-sign.service.js'

import { SiiClient } from './sii/sii-client.js'

type ProcessResult = {
    document: BillingDocument
    submission: BillingSiiSubmission | null
    siiMode: string
}

async function loadDocument(documentId: string) {
    return BillingDocument.findByPk(documentId, {
        include: [
            {
                model: BillingDocumentItem,

                as: 'items',
            },
        ],
    })
}

export async function processBillingDocument(
    documentId: string,
): Promise<ProcessResult> {
    const siiMode = process.env.SII_MODE || 'mock'

    const initialDocument = await loadDocument(documentId)

    if (!initialDocument) {
        throw new Error('Documento no encontrado')
    }

    let document: BillingDocument = initialDocument

    /**
     * =====================================================
     * IDEMPOTENCIA DEL PROCESO
     * =====================================================
     *
     * Si ya quedó aceptado no procesamos nuevamente.
     */

    if (document.status === 'accepted' && document.sii_track_id) {
        return {
            document,
            submission: null,
            siiMode,
        }
    }

    let submission: BillingSiiSubmission | null = null

    try {
        /**
         * =================================================
         * 1. GENERAR DTE XML
         * =================================================
         */

        if (!document.xml_path) {
            await generateDteXml(document.id)

            const reloadedDocument = await loadDocument(document.id)

            if (!reloadedDocument) {
                throw new Error('Documento desapareció después de generar XML')
            }

            document = reloadedDocument

            if (!document) {
                throw new Error('Documento desapareció después de generar XML')
            }
        }

        /**
         * =================================================
         * 2. FIRMAR DTE
         * =================================================
         */

        if (document.status === 'xml_generated') {
            if (!document.xml_path) {
                throw new Error('Documento sin xml_path')
            }

            const signedDte = await signXmlFile(document.xml_path)

            await document.update({
                xml_path: signedDte.signedPath,

                status: 'signed',
            })
        }

        /**
         * =================================================
         * 3. BUSCAR SUBMISSION EXISTENTE
         * =================================================
         */

        const existingLink = await BillingSiiSubmissionDocument.findOne({
            where: {
                billing_document_id: document.id,
            },
        })

        if (existingLink) {
            submission = await BillingSiiSubmission.findByPk(
                existingLink.submission_id,
            )
        }

        /**
         * =================================================
         * 4. CREAR SUBMISSION
         * =================================================
         */

        if (!submission) {
            await sequelize.transaction(async (transaction) => {
                submission = await BillingSiiSubmission.create(
                    {
                        submission_type: 'envio_dte',

                        status: 'created',

                        track_id: null,

                        envelope_path: null,

                        signed_envelope_path: null,

                        response_payload: null,

                        error_message: null,

                        sent_at: null,

                        checked_at: null,
                    },
                    {
                        transaction,
                    },
                )

                await BillingSiiSubmissionDocument.create(
                    {
                        submission_id: submission.id,

                        billing_document_id: document.id,
                    },
                    {
                        transaction,
                    },
                )
            })
        }

        if (!submission) {
            throw new Error('No fue posible crear submission SII')
        }

        /**
         * =================================================
         * 5. GENERAR ENVIODTE
         * =================================================
         */

        if (!submission.envelope_path) {
            const envio = await generateEnvioDteXml(submission.id, [document])

            await submission.update({
                envelope_path: envio.envelopePath,

                status: 'envelope_generated',
            })
        }

        /**
         * =================================================
         * 6. FIRMAR ENVIODTE
         * =================================================
         */

        if (!submission.signed_envelope_path) {
            if (!submission.envelope_path) {
                throw new Error('Submission sin envelope_path')
            }

            const signedEnvelope = await signEnvioDteFile(
                submission.envelope_path,
            )

            await submission.update({
                signed_envelope_path: signedEnvelope.signedPath,

                status: 'envelope_signed',
            })
        }

        /**
         * =================================================
         * 7. SUBIR A SII / MOCK
         * =================================================
         */

        if (!submission.track_id) {
            if (!submission.signed_envelope_path) {
                throw new Error('Submission sin sobre firmado')
            }

            const siiClient = new SiiClient()

            const upload = await siiClient.uploadEnvelope(
                submission.signed_envelope_path,
            )

            await submission.update({
                track_id: upload.trackId,

                status: 'sent',

                response_payload: upload.rawResponse,

                sent_at: new Date(),

                error_message: null,
            })

            await document.update({
                sii_track_id: upload.trackId,

                status: 'sent',

                error_message: null,
            })
        }

        /**
         * =================================================
         * 8. CONSULTAR ESTADO
         * =================================================
         */

        if (!submission.track_id) {
            throw new Error('No existe TrackID para consultar estado')
        }

        const siiClient = new SiiClient()

        const statusResult = await siiClient.getSubmissionStatus(
            submission.track_id,
        )

        await submission.update({
            status: statusResult.status,

            response_payload: statusResult.rawResponse,

            error_message: statusResult.errorMessage || null,

            checked_at: new Date(),
        })

        await document.update({
            status: statusResult.status,

            sii_track_id: submission.track_id,

            error_message: statusResult.errorMessage || null,
        })

        const finalDocument = await loadDocument(document.id)

        if (!finalDocument) {
            throw new Error('Documento no encontrado al finalizar proceso')
        }

        document = finalDocument

        if (!document) {
            throw new Error('Documento no encontrado al finalizar proceso')
        }

        return {
            document,
            submission,
            siiMode,
        }
    } catch (error: any) {
        const errorMessage = error?.message || 'Error procesando documento'

        await document.update({
            status: 'error',

            error_message: errorMessage,
        })

        if (submission) {
            await submission.update({
                status: 'error',

                error_message: errorMessage,
            })
        }

        throw error
    }
}
