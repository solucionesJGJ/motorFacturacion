import { sequelize } from '../database/sequelize.js'

import {
    BillingDocument,
    initBillingDocumentModel,
} from './billing-document.model.js'

import {
    BillingDocumentItem,
    initBillingDocumentItemModel,
} from './billing-document-item.model.js'

import {
    BillingFileImport,
    initBillingFileImportModel,
} from './billing-file-import.model.js'

import {
    BillingWebhookEvent,
    initBillingWebhookEventModel,
} from './billing-webhook-event.model.js'

import {
    BillingJob,
    initBillingJobModel,
} from './billing-job.model.js'

import {
    BillingCaf,
    initBillingCafModel,
} from './billing-caf.model.js'

import {
    BillingFolioSequence,
    initBillingFolioSequenceModel,
} from './billing-folio-sequence.model.js'

import {
    BillingSiiSubmission,
    initBillingSiiSubmissionModel,
} from './billing-sii-submission.model.js'

import {
    BillingSiiSubmissionDocument,
    initBillingSiiSubmissionDocumentModel,
} from './billing-sii-submission-document.model.js'

initBillingDocumentModel(sequelize)
initBillingDocumentItemModel(sequelize)
initBillingFileImportModel(sequelize)
initBillingWebhookEventModel(sequelize)
initBillingJobModel(sequelize)
initBillingCafModel(sequelize)
initBillingFolioSequenceModel(sequelize)
initBillingSiiSubmissionModel(sequelize)
initBillingSiiSubmissionDocumentModel(sequelize)

BillingDocument.hasMany(BillingDocumentItem, {
    foreignKey: 'billing_document_id',
    as: 'items',
})

BillingDocumentItem.belongsTo(BillingDocument, {
    foreignKey: 'billing_document_id',
    as: 'document',
})

BillingWebhookEvent.hasMany(BillingJob, {
    foreignKey: 'webhook_event_id',
    as: 'jobs',
})

BillingJob.belongsTo(BillingWebhookEvent, {
    foreignKey: 'webhook_event_id',
    as: 'webhook_event',
})

BillingCaf.hasMany(BillingFolioSequence, {
    foreignKey: 'caf_id',
    as: 'folio_sequences',
})

BillingFolioSequence.belongsTo(BillingCaf, {
    foreignKey: 'caf_id',
    as: 'caf',
})

BillingCaf.hasMany(BillingDocument, {
    foreignKey: 'caf_id',
    as: 'documents',
})

BillingDocument.belongsTo(BillingCaf, {
    foreignKey: 'caf_id',
    as: 'caf',
})

BillingSiiSubmission.hasMany(BillingSiiSubmissionDocument, {
    foreignKey: 'submission_id',
    as: 'submission_documents',
})

BillingSiiSubmissionDocument.belongsTo(BillingSiiSubmission, {
    foreignKey: 'submission_id',
    as: 'submission',
})

BillingDocument.hasMany(BillingSiiSubmissionDocument, {
    foreignKey: 'billing_document_id',
    as: 'sii_submission_links',
})

BillingSiiSubmissionDocument.belongsTo(BillingDocument, {
    foreignKey: 'billing_document_id',
    as: 'document',
})

export {
    sequelize,
    BillingDocument,
    BillingDocumentItem,
    BillingFileImport,
    BillingWebhookEvent,
    BillingJob,
    BillingCaf,
    BillingFolioSequence,
    BillingSiiSubmission,
    BillingSiiSubmissionDocument,
}
