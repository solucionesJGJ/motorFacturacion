import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
    type Sequelize,
} from 'sequelize'

export class BillingFileImport extends Model<
    InferAttributes<BillingFileImport>,
    InferCreationAttributes<BillingFileImport>
> {
    declare id: CreationOptional<string>
    declare filename: string
    declare original_path: string
    declare status: CreationOptional<string>
    declare error_message: string | null
    declare processed_at: Date | null
    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>
}

export function initBillingFileImportModel(sequelize: Sequelize) {
    BillingFileImport.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            filename: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            original_path: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            status: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'pending',
            },
            error_message: DataTypes.TEXT,
            processed_at: DataTypes.DATE,
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
            tableName: 'billing_file_imports',
            timestamps: true,
            underscored: true,
        },
    )

    return BillingFileImport
}