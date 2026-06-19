import type { Request, Response, NextFunction } from 'express'

export function apiKeyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const expectedApiKey = process.env.BILLING_API_KEY

    if (!expectedApiKey) {
        return res.status(500).json({
            ok: false,
            message: 'BILLING_API_KEY no está configurada',
        })
    }

    const apiKey =
        req.headers['x-api-key'] ||
        req.headers['authorization']?.replace('Bearer ', '')

    if (!apiKey || apiKey !== expectedApiKey) {
        return res.status(401).json({
            ok: false,
            message: 'API Key inválida o no informada',
        })
    }

    next()
}