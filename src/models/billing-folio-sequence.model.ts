import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
    type Sequelize,
} from 'sequelize'

export class BillingFolioSequence extends Model<
    InferAttributes<BillingFolioSequence>,
    InferCreationAttributes<BillingFolioSequence>
> {
    declare id: CreationOptional<string>
    declare document_type: number
    declare issuer_rut: string
    declare caf_id: string
    declare current_folio: number
    declare folio_from: number
    declare folio_to: number
    declare active: CreationOptional<boolean>
    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>
}

export function initBillingFolioSequenceModel(sequelize: Sequelize) {
    BillingFolioSequence.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            document_type: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            issuer_rut: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },
            caf_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            current_folio: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            folio_from: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            folio_to: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
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
            tableName: 'billing_folio_sequences',
            timestamps: true,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ['document_type', 'issuer_rut', 'caf_id'],
                },
            ],
        },
    )

    return BillingFolioSequence
}