import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
    type Sequelize,
} from 'sequelize'

export class BillingSiiSubmissionDocument extends Model<
    InferAttributes<BillingSiiSubmissionDocument>,
    InferCreationAttributes<BillingSiiSubmissionDocument>
> {
    declare id: CreationOptional<string>
    declare submission_id: string
    declare billing_document_id: string
    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>
}

export function initBillingSiiSubmissionDocumentModel(sequelize: Sequelize) {
    BillingSiiSubmissionDocument.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            submission_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            billing_document_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                field: 'created_at',
            },
            updatedAt: {
                type: DataTypes.DATE,
                field: 'updated_at',
            },
        },
        {
            sequelize,
            tableName: 'billing_sii_submission_documents',
            timestamps: true,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ['submission_id', 'billing_document_id'],
                },
            ],
        },
    )

    return BillingSiiSubmissionDocument
}
