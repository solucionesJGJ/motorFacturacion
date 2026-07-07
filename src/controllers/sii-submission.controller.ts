import type { Request, Response } from 'express'
import {
    checkSubmissionStatus,
    createSubmissionFromDocuments,
    generateEnvelope,
    getSubmissionById,
    listSubmissions,
    sendSubmission,
    signEnvelope,
} from '../services/sii-submission.service.js'

function getParamId(req: Request) {
    return typeof req.params.id === 'string' ? req.params.id : null
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

/**
 * Creates a SII submission from signed billing documents.
 * Documents are linked for traceability before envelope generation.
 */
export async function createSiiSubmission(req: Request, res: Response) {
    try {
        const documentIds = Array.isArray(req.body?.documentIds)
            ? req.body.documentIds
            : []

        const submission = await createSubmissionFromDocuments(documentIds)

        return res.status(201).json({
            ok: true,
            message: 'Submission SII creada correctamente',
            data: submission,
        })
    } catch (error) {
        return res.status(400).json({
            ok: false,
            message: getErrorMessage(error, 'Error creando submission SII'),
        })
    }
}

export async function getSiiSubmissions(_req: Request, res: Response) {
    const submissions = await listSubmissions()

    return res.json({
        ok: true,
        data: submissions,
    })
}

export async function getSiiSubmission(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const submission = await getSubmissionById(id)

        return res.json({
            ok: true,
            data: submission,
        })
    } catch (error) {
        return res.status(404).json({
            ok: false,
            message: getErrorMessage(error, 'Submission SII no encontrada'),
        })
    }
}

/**
 * Generates and stores the EnvioDTE envelope for a submission.
 */
export async function generateSiiEnvelope(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const result = await generateEnvelope(id)

        return res.json({
            ok: true,
            message: 'EnvioDTE generado correctamente',
            data: {
                submission_id: result.submission.id,
                envelope_path: result.envelopePath,
            },
        })
    } catch (error) {
        return res.status(400).json({
            ok: false,
            message: getErrorMessage(error, 'Error generando EnvioDTE'),
        })
    }
}

/**
 * Signs a generated EnvioDTE envelope and moves submission to envelope_signed.
 */
export async function signSiiEnvelope(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const result = await signEnvelope(id)

        return res.json({
            ok: true,
            message: 'EnvioDTE firmado correctamente',
            data: {
                submission_id: result.submission.id,
                signed_envelope_path: result.signedPath,
            },
        })
    } catch (error) {
        return res.status(400).json({
            ok: false,
            message: getErrorMessage(error, 'Error firmando EnvioDTE'),
        })
    }
}

/**
 * Sends a signed envelope to SII or mock SII and stores the TrackID.
 */
export async function sendSiiSubmission(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const result = await sendSubmission(id)

        return res.json({
            ok: true,
            message: 'Submission enviada correctamente',
            data: {
                submission_id: result.submission.id,
                track_id: result.trackId,
                response: result.rawResponse,
            },
        })
    } catch (error) {
        return res.status(400).json({
            ok: false,
            message: getErrorMessage(error, 'Error enviando submission'),
        })
    }
}

export async function getSiiSubmissionStatus(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const submission = await getSubmissionById(id)

        return res.json({
            ok: true,
            data: {
                id: submission.id,
                status: submission.status,
                track_id: submission.track_id,
                checked_at: submission.checked_at,
                response_payload: submission.response_payload,
                error_message: submission.error_message,
            },
        })
    } catch (error) {
        return res.status(404).json({
            ok: false,
            message: getErrorMessage(error, 'Submission SII no encontrada'),
        })
    }
}

/**
 * Queries SII/mock SII for the TrackID and updates the submission status.
 */
export async function checkSiiSubmissionStatus(req: Request, res: Response) {
    try {
        const id = getParamId(req)

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: 'Id invalido',
            })
        }

        const result = await checkSubmissionStatus(id)

        return res.json({
            ok: true,
            message: 'Estado SII actualizado correctamente',
            data: {
                submission_id: result.submission.id,
                status: result.status,
                response: result.rawResponse,
            },
        })
    } catch (error) {
        return res.status(400).json({
            ok: false,
            message: getErrorMessage(error, 'Error consultando estado SII'),
        })
    }
}
