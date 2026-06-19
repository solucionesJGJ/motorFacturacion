import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
    type Sequelize,
} from 'sequelize'

export class BillingDocumentItem extends Model<
    InferAttributes<BillingDocumentItem>,
    InferCreationAttributes<BillingDocumentItem>
> {
    declare id: CreationOptional<string>
    declare billing_document_id: string
    declare line_number: number
    declare description: string
    declare quantity: number
    declare unit_price: number
    declare net_amount: number
    declare tax_amount: number
    declare total_amount: number
    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>
}

export function initBillingDocumentItemModel(sequelize: Sequelize) {
    BillingDocumentItem.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            billing_document_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            line_number: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            quantity: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
            },
            unit_price: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
            },
            net_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
            },
            tax_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
            },
            total_amount: {
                type: DataTypes.DECIMAL(12, 2),
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
            tableName: 'billing_document_items',
            timestamps: true,
            underscored: true,
        },
    )

    return BillingDocumentItem
}