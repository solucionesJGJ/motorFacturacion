export type SiiUploadResult = {
    trackId: string
    rawResponse: object
}

export type SiiSubmissionStatus =
    | 'accepted'
    | 'rejected'
    | 'processing'
    | 'error'

export type SiiStatusResult = {
    status: SiiSubmissionStatus
    rawResponse: object
    errorMessage?: string | null
}
