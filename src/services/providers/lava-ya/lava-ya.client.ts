import type { LavaYaOrder, LavaYaPayment } from './lava-ya.types.js'

export class LavaYaClient {
    constructor(
        private readonly baseUrl: string,
        private readonly apiKey: string,
    ) { }

    private getHeaders() {
        return {
            Accept: 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'x-api-key': this.apiKey,
        }
    }

    async getPayment(paymentId: string): Promise<LavaYaPayment> {
        const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
            headers: this.getHeaders(),
        })

        if (!response.ok) {
            throw new Error(`Error consultando pago Lava Ya: ${response.status}`)
        }

        return response.json() as Promise<LavaYaPayment>
    }

    async getOrder(orderId: string): Promise<LavaYaOrder> {
        const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
            headers: this.getHeaders(),
        })

        if (!response.ok) {
            throw new Error(`Error consultando orden Lava Ya: ${response.status}`)
        }

        return response.json() as Promise<LavaYaOrder>
    }
}