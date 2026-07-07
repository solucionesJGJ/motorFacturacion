import { getSiiAuthToken } from './sii-auth.service.js'
import { uploadSiiEnvelope } from './sii-upload.service.js'
import { getSiiSubmissionStatus } from './sii-status.service.js'

export class SiiClient {
    async uploadEnvelope(signedEnvelopePath: string) {
        const authToken = await getSiiAuthToken()

        return uploadSiiEnvelope(signedEnvelopePath, authToken)
    }

    async getSubmissionStatus(trackId: string) {
        const authToken = await getSiiAuthToken()

        return getSiiSubmissionStatus(trackId, authToken)
    }
}
