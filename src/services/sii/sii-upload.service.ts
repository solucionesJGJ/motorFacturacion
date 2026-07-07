import type { SiiUploadResult } from './sii-types.js'

export async function uploadSiiEnvelope(
    signedEnvelopePath: string,
    _authToken: string,
): Promise<SiiUploadResult> {
    const mode = process.env.SII_MODE || 'mock'

    if (mode === 'mock') {
        return {
            trackId: `MOCK-${Date.now()}`,
            rawResponse: {
                mode,
                signedEnvelopePath,
                received: true,
            },
        }
    }

    throw new Error('SII real mode not configured')
}
