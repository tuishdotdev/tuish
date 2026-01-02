import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
} from '@tuish/types';

const DEFAULT_API_URL = 'https://tuish-api-production.doug-lance.workers.dev';

export class TuishApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'TuishApiError';
  }
}

export type ApiOptions = {
  apiKey?: string;
  apiBaseUrl?: string;
};

export class TuishDeveloperApi {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(options: ApiOptions) {
    this.baseUrl = options.apiBaseUrl ?? DEFAULT_API_URL;
    this.apiKey = options.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      throw new TuishApiError(
        (data.error as string) ??
          `Request failed with status ${response.status}`,
        response.status,
        data.code as string | undefined,
      );
    }

    return data as T;
  }

  async signup(data: { email: string; name?: string }): Promise<{
    developer: {
      id: string;
      email: string;
      name: string | null;
      createdAt: number;
    };
    apiKey: string;
  }> {
    return this.request('POST', '/v1/developers/signup', data);
  }

  async listProducts(): Promise<{ products: Product[] }> {
    return this.request('GET', '/v1/developers/products');
  }

  async createProduct(data: CreateProductInput): Promise<{ product: Product }> {
    return this.request('POST', '/v1/developers/products', data);
  }

  async updateProduct(
    id: string,
    data: UpdateProductInput,
  ): Promise<{ product: Product }> {
    return this.request('PATCH', `/v1/developers/products/${id}`, data);
  }

  async getConnectStatus(): Promise<{ connected: boolean; accountId: string | null }> {
    return this.request('GET', '/v1/connect/status');
  }

  async startConnect(): Promise<{ authUrl: string }> {
    return this.request('POST', '/v1/connect/start');
  }
}
