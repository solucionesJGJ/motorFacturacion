export async function getSiiAuthToken() {
    const mode = process.env.SII_MODE || 'mock'

    if (mode === 'mock') {
        return 'mock-sii-token'
    }

    throw new Error('SII real mode not configured')
}
