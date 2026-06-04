import axios from 'axios';

export class MarketplaceApiError extends Error {
    readonly statusCode: number;
    readonly upstreamMessage?: string;

    constructor(message: string, statusCode: number, upstreamMessage?: string) {
        super(message);
        this.name = 'MarketplaceApiError';
        this.statusCode = statusCode;
        this.upstreamMessage = upstreamMessage;
    }
}

export function throwMarketplaceApiError(error: unknown, context: string): never {
    if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const body = error.response.data as { message?: string; error?: string } | undefined;
        const upstreamMessage = body?.message ?? body?.error;
        const message = upstreamMessage
            ? `${context}: ${upstreamMessage}`
            : `${context} (HTTP ${status})`;
        throw new MarketplaceApiError(message, status, upstreamMessage);
    }
    throw error;
}
