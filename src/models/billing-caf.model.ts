import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
    type Sequelize,
} from 'sequelize'

export class BillingCaf extends Model<
    InferAttributes<BillingCaf>,
    InferCreationAttributes<BillingCaf>
> {
    declare id: CreationOptional<string>
    declare document_type: number
    declare issuer_rut: string
    declare folio_from: number
    declare folio_to: number
    declare caf_xml: string
    declare private_key: string | null
    declare public_key: string | null
    declare authorization_date: Date | null
    declare expires_at: Date | null
    declare active: CreationOptional<boolean>
    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>
}

export function initBillingCafModel(sequelize: Sequelize) {
    BillingCaf.init(
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
            folio_from: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            folio_to: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            caf_xml: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            private_key: DataTypes.TEXT,
            public_key: DataTypes.TEXT,
            authorization_date: DataTypes.DATEONLY,
            expires_at: DataTypes.DATEONLY,
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
            tableName: 'billing_cafs',
            timestamps: true,
            underscored: true,
        },
    )

    return BillingCaf
}