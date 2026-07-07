import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
    type Sequelize,
} from 'sequelize'

export class BillingSiiSubmission extends Model<
    InferAttributes<BillingSiiSubmission>,
    InferCreationAttributes<BillingSiiSubmission>
> {
    declare id: CreationOptional<string>
    declare submission_type: string
    declare status: CreationOptional<string>
    declare track_id: string | null
    declare envelope_path: string | null
    declare signed_envelope_path: string | null
    declare response_payload: object | null
    declare error_message: string | null
    declare sent_at: Date | null
    declare checked_at: Date | null
    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>
}

export function initBillingSiiSubmissionModel(sequelize: Sequelize) {
    BillingSiiSubmission.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            submission_type: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            status: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'created',
            },
            track_id: DataTypes.STRING(150),
            envelope_path: DataTypes.TEXT,
            signed_envelope_path: DataTypes.TEXT,
            response_payload: DataTypes.JSONB,
            error_message: DataTypes.TEXT,
            sent_at: DataTypes.DATE,
            checked_at: DataTypes.DATE,
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
            tableName: 'billing_sii_submissions',
            timestamps: true,
            underscored: true,
            indexes: [
                {
                    fields: ['status'],
                },
                {
                    fields: ['track_id'],
                },
            ],
        },
    )

    return BillingSiiSubmission
}
