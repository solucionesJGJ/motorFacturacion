import type { Transaction, WhereOptions } from 'sequelize'
import {
    BillingDocument,
    BillingSiiSubmission,
    BillingSiiSubmissionDocument,
    sequelize,
} from '../models/index.js'
import { generateEnvioDteXml } from './envio-dte.service.js'
import { signXmlFile } from './xml-sign.service.js'
import { SiiClient } from './sii/sii-client.js'

function normalizeIds(documentIds: unknown) {
    if (!Array.isArray(documentIds)) {
        return []
    }

    return Array.from(
        new Set(
            documentIds
                .filter((documentId): documentId is string => {
                    return (
                        typeof documentId === 'string' &&
                        documentId.trim().length > 0
                    )
                })
                .map((documentId) => documentId.trim()),
        ),
    )
}

async function getSubmissionWithDocuments(
    submissionId: string,
    options: { transaction?: Transaction } = {},
) {
    const submission = await BillingSiiSubmission.findByPk(submissionId, {
        include: [
            {
                model: BillingSiiSubmissionDocument,
                as: 'submission_documents',
                include: [
                    {
                        model: BillingDocument,
                        as: 'document',
                    },
                ],
            },
        ],
        transaction: options.transaction,
    })

    if (!submission) {
        throw new Error('Submission SII no encontrada')
    }

    return submission
}

function extractDocuments(submission: BillingSiiSubmission) {
    const payload = submission.toJSON() as {
        submission_documents?: Array<{ document?: BillingDocument }>
    }

    return (payload.submission_documents || [])
        .map((link) => link.document)
        .filter(Boolean) as BillingDocument[]
}

export async function createSubmissionFromDocuments(documentIds: string[]) {
    const ids = normalizeIds(documentIds)

    if (ids.length === 0) {
        throw new Error('Debe informar al menos un documentId')
    }

    const documents = await BillingDocument.findAll({
        where: { id: ids } as WhereOptions,
    })

    if (documents.length !== ids.length) {
        const foundIds = new Set(documents.map((document) => document.id))
        const missingIds = ids.filter((documentId) => !foundIds.has(documentId))

        throw new Error(
            `Uno o mas documentos no existen: ${missingIds.join(', ')}`,
        )
    }

    const notSigned = documents.filter(
        (document) => document.status !== 'signed',
    )

    if (notSigned.length > 0) {
        throw new Error(
            `Todos los documentos deben estar firmados. Pendientes: ${notSigned
                .map((document) => document.id)
                .join(', ')}`,
        )
    }

    try {
        return await sequelize.transaction(async (transaction) => {
            const submission = await BillingSiiSubmission.create(
                {
                    submission_type: 'EnvioDTE',
                    status: 'created',
                    track_id: null,
                    envelope_path: null,
                    signed_envelope_path: null,
                    response_payload: null,
                    error_message: null,
                    sent_at: null,
                    checked_at: null,
                },
                { transaction },
            )

            await BillingSiiSubmissionDocument.bulkCreate(
                ids.map((documentId) => ({
                    submission_id: submission.id,
                    billing_document_id: documentId,
                })),
                { transaction },
            )

            return getSubmissionWithDocuments(submission.id, { transaction })
        })
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Error desconocido creando submission SII'

        throw new Error(`No se pudo crear submission SII: ${message}`)
    }
}

export async function generateEnvelope(submissionId: string) {
    const submission = await getSubmissionWithDocuments(submissionId)
    const documents = extractDocuments(submission)

    const { envelopePath, xml } = await generateEnvioDteXml(
        submission.id,
        documents,
    )

    await submission.update({
        envelope_path: envelopePath,
        status: 'envelope_generated',
        error_message: null,
    })

    return {
        submission,
        envelopePath,
        xml,
    }
}

export async function signEnvelope(submissionId: string) {
    const submission = await BillingSiiSubmission.findByPk(submissionId)

    if (!submission) {
        throw new Error('Submission SII no encontrada')
    }

    if (!submission.envelope_path) {
        throw new Error('La submission no tiene EnvioDTE generado')
    }

    const result = await signXmlFile(submission.envelope_path)

    await submission.update({
        signed_envelope_path: result.signedPath,
        status: 'envelope_signed',
        error_message: null,
    })

    return {
        submission,
        signedPath: result.signedPath,
    }
}

export async function sendSubmission(submissionId: string) {
    const submission = await BillingSiiSubmission.findByPk(submissionId)

    if (!submission) {
        throw new Error('Submission SII no encontrada')
    }

    if (!submission.signed_envelope_path) {
        throw new Error('La submission no tiene EnvioDTE firmado')
    }

    const client = new SiiClient()
    const result = await client.uploadEnvelope(submission.signed_envelope_path)

    await submission.update({
        status: 'sent',
        track_id: result.trackId,
        response_payload: result.rawResponse,
        error_message: null,
        sent_at: new Date(),
    })

    await BillingDocument.update(
        {
            sii_track_id: result.trackId,
        },
        {
            where: {
                id: (
                    await BillingSiiSubmissionDocument.findAll({
                        where: {
                            submission_id: submission.id,
                        },
                    })
                ).map((link) => link.billing_document_id),
            },
        },
    )

    return {
        submission,
        trackId: result.trackId,
        rawResponse: result.rawResponse,
    }
}

export async function checkSubmissionStatus(submissionId: string) {
    const submission = await BillingSiiSubmission.findByPk(submissionId)

    if (!submission) {
        throw new Error('Submission SII no encontrada')
    }

    if (!submission.track_id) {
        throw new Error('La submission no tiene TrackID')
    }

    const client = new SiiClient()
    const result = await client.getSubmissionStatus(submission.track_id)

    await submission.update({
        status: result.status,
        response_payload: result.rawResponse,
        error_message: result.errorMessage || null,
        checked_at: new Date(),
    })

    return {
        submission,
        status: result.status,
        rawResponse: result.rawResponse,
    }
}

export async function listSubmissions() {
    return BillingSiiSubmission.findAll({
        include: [
            {
                model: BillingSiiSubmissionDocument,
                as: 'submission_documents',
                include: [{ model: BillingDocument, as: 'document' }],
            },
        ],
        order: [['createdAt', 'DESC']],
    })
}

export async function getSubmissionById(submissionId: string) {
    return getSubmissionWithDocuments(submissionId)
}
