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

initBillingDocumentModel(sequelize)
initBillingDocumentItemModel(sequelize)
initBillingFileImportModel(sequelize)
initBillingWebhookEventModel(sequelize)
initBillingJobModel(sequelize)

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

export {
    sequelize,
    BillingDocument,
    BillingDocumentItem,
    BillingFileImport,
    BillingWebhookEvent,
    BillingJob,
}