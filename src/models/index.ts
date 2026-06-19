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

initBillingDocumentModel(sequelize)
initBillingDocumentItemModel(sequelize)
initBillingFileImportModel(sequelize)

BillingDocument.hasMany(BillingDocumentItem, {
    foreignKey: 'billing_document_id',
    as: 'items',
})

BillingDocumentItem.belongsTo(BillingDocument, {
    foreignKey: 'billing_document_id',
    as: 'document',
})

export {
    sequelize,
    BillingDocument,
    BillingDocumentItem,
    BillingFileImport,
}