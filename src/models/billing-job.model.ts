import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
    type Sequelize,
} from 'sequelize'

export class BillingJob extends Model<
    InferAttributes<BillingJob>,
    InferCreationAttributes<BillingJob>
> {
    declare id: CreationOptional<string>
    declare provider: string
    declare type: string
    declare webhook_event_id: string | null
    declare external_payment_id: string | null
    declare status: CreationOptional<string>
    declare attempts: CreationOptional<number>
    declare error_message: string | null
    declare processed_at: Date | null
    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>
}

export function initBillingJobModel(sequelize: Sequelize) {
    BillingJob.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            provider: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            type: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            webhook_event_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            external_payment_id: {
                type: DataTypes.STRING(150),
                allowNull: true,
            },
            status: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'pending',
            },
            attempts: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
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
            tableName: 'billing_jobs',
            timestamps: true,
            underscored: true,
            indexes: [
                {
                    fields: ['status'],
                },
                {
                    fields: ['provider', 'external_payment_id'],
                },
            ],
        },
    )

    return BillingJob
}