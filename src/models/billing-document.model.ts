import {
    DataTypes,
    Model,
    Op,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
    type Sequelize,
} from 'sequelize'

export class BillingDocument extends Model<
    InferAttributes<BillingDocument>,
    InferCreationAttributes<BillingDocument>
> {
    declare id: CreationOptional<string>
    declare source_type: string
    declare source_filename: string | null
    declare external_provider: string | null
    declare external_order_id: string | null
    declare external_payment_id: string | null
    declare document_type: number
    declare folio: number | null
    declare receiver_rut: string
    declare receiver_name: string
    declare receiver_giro: string | null
    declare receiver_address: string | null
    declare receiver_comuna: string | null
    declare receiver_ciudad: string | null
    declare dispatch_transfer_indicator: number | null
    declare dispatch_type: number | null
    declare dispatch_vehicle_plate: string | null
    declare dispatch_carrier_rut: string | null
    declare dispatch_driver_rut: string | null
    declare dispatch_driver_name: string | null
    declare dispatch_destination_address: string | null
    declare dispatch_destination_commune: string | null
    declare dispatch_destination_city: string | null
    declare dispatch_departure_date: string | null
    declare dispatch_departure_time: string | null
    declare dispatch_arrival_date: string | null
    declare net_amount: number
    declare tax_amount: number
    declare total_amount: number
    declare status: CreationOptional<string>
    declare sii_track_id: string | null
    declare xml_path: string | null
    declare pdf_path: string | null
    declare error_message: string | null
    declare createdAt: CreationOptional<Date>
    declare updatedAt: CreationOptional<Date>
    declare indexes?: CreationOptional<{
        unique: boolean
        fields: string[]
    }>
    declare caf_id: string | null
    declare printed_at: CreationOptional<Date>
    declare print_count: CreationOptional<number>
    declare pdf_print_path: CreationOptional<string>
}

export function initBillingDocumentModel(sequelize: Sequelize) {
    BillingDocument.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            source_type: {
                type: DataTypes.STRING(30),
                allowNull: false,
            },
            source_filename: DataTypes.STRING(255),
            external_provider: DataTypes.STRING(50),
            external_order_id: DataTypes.STRING(150),
            external_payment_id: DataTypes.STRING(150),
            document_type: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            folio: DataTypes.INTEGER,
            receiver_rut: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },
            receiver_name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            receiver_giro: DataTypes.STRING(255),
            receiver_address: DataTypes.STRING(255),
            receiver_comuna: DataTypes.STRING(100),
            receiver_ciudad: DataTypes.STRING(100),
            /**
             * =================================================
             * DTE 52 - DATOS DE DESPACHO / TRANSPORTE
             * =================================================
             *
             * Para DTE 33 todos estos campos permanecen NULL.
             */
            dispatch_transfer_indicator: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: 1,
                    max: 9,
                },
            },
            dispatch_type: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: 1,
                    max: 3,
                },
            },
            dispatch_vehicle_plate: {
                type: DataTypes.STRING(8),
                allowNull: true,
            },
            dispatch_carrier_rut: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },
            dispatch_driver_rut: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },
            dispatch_driver_name: {
                type: DataTypes.STRING(30),
                allowNull: true,
            },
            dispatch_destination_address: {
                type: DataTypes.STRING(70),
                allowNull: true,
            },
            dispatch_destination_commune: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },
            dispatch_destination_city: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },
            dispatch_departure_date: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            dispatch_departure_time: {
                type: DataTypes.STRING(8),
                allowNull: true,
            },
            dispatch_arrival_date: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            net_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0,
            },
            tax_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0,
            },
            total_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0,
            },
            status: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'validated',
            },
            sii_track_id: DataTypes.STRING(100),
            xml_path: DataTypes.TEXT,
            pdf_path: DataTypes.TEXT,
            error_message: DataTypes.TEXT,
            createdAt: {
                type: DataTypes.DATE,
                field: 'created_at',
            },
            updatedAt: {
                type: DataTypes.DATE,
                field: 'updated_at',
            },
            caf_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            printed_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            print_count: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0,
            },
            pdf_print_path: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
        },
        {
            sequelize,
            tableName: 'billing_documents',
            timestamps: true,
            underscored: true,
            indexes: [
                {
                    unique: true,
                    fields: ['external_provider', 'external_payment_id'],
                    where: {
                        external_provider: {
                            [Op.ne]: null,
                        },
                        external_payment_id: {
                            [Op.ne]: null,
                        },
                    },
                },
            ],
        },
    )

    return BillingDocument
}
