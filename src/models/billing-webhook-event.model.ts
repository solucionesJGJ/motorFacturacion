import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
    type Sequelize,
} from 'sequelize'

export class BillingWebhookEvent extends Model<
    InferAttributes<BillingWebhookEvent>,
    InferCreationAttributes<BillingWebhookEvent>
> {
    declare id: CreationOptional<string>
    declare provider: string
    declare external_event_id: string
    declare external_payment_id: string | null
    declare event_type: string
    declare payload: object
    declare status: CreationOptional<string>
    declare error_message: string | null
    declare processed_at: Date | null
    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>
}

export function initBillingWebhookEventModel(sequelize: Sequelize) {
    BillingWebhookEvent.init(
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
            external_event_id: {
                type: DataTypes.STRING(150),
                allowNull: false,
            },
            external_payment_id: DataTypes.STRING(150),
            event_type: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            payload: {
                type: DataTypes.JSONB,
                allowNull: false,
            },
            status: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'received',
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
            tableName: 'billing_webhook_events',
            timestamps: true,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ['provider', 'external_event_id'],
                },
            ],
        },
    )

    return BillingWebhookEvent
}