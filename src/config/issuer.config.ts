export function getIssuerConfig() {
    const required = [
        'ISSUER_RUT',
        'ISSUER_RAZON_SOCIAL',
        'ISSUER_GIRO',
        'ISSUER_DIRECCION',
        'ISSUER_COMUNA',
        'ISSUER_CIUDAD',
    ]

    for (const key of required) {
        if (!process.env[key]) {
            throw new Error(`${key} no esta configurada`)
        }
    }

    return {
        rut: process.env.ISSUER_RUT!,
        razonSocial: process.env.ISSUER_RAZON_SOCIAL!,
        giro: process.env.ISSUER_GIRO!,
        acteco: process.env.ISSUER_ACTECO || null,
        direccion: process.env.ISSUER_DIRECCION!,
        comuna: process.env.ISSUER_COMUNA!,
        ciudad: process.env.ISSUER_CIUDAD!,
    }
}
