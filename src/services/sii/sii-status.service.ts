import type { SiiStatusResult } from './sii-types.js'

function getMockStatus(trackId: string): SiiStatusResult {
    if (trackId.includes('REJECT')) {
        return {
            status: 'rejected',
            rawResponse: {
                trackId,
                estado: 'RECHAZADO',
            },
            errorMessage: 'Envio rechazado en modo mock',
        }
    }

    if (trackId.includes('PENDING')) {
        return {
            status: 'processing',
            rawResponse: {
                trackId,
                estado: 'EN_PROCESO',
            },
        }
    }

    return {
        status: 'accepted',
        rawResponse: {
            trackId,
            estado: 'ACEPTADO',
        },
    }
}

export async function getSiiSubmissionStatus(
    trackId: string,
    _authToken: string,
): Promise<SiiStatusResult> {
    const mode = process.env.SII_MODE || 'mock'

    if (mode === 'mock') {
        return getMockStatus(trackId)
    }

    throw new Error('SII real mode not configured')
}
