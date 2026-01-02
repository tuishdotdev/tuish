import type { Product, CreateProductInput, UpdateProductInput } from '@tuish/types';
import { TuishDeveloperApi, TuishApiError } from '../api.js';
import type { PlatformContext } from '../adapters/types.js';
import type { CommandResult } from '../types.js';
import { ErrorCodes } from '../types.js';

function getAuthenticatedApi(ctx: PlatformContext): TuishDeveloperApi | null {
  const apiKey = ctx.config.getApiKey();
  if (!apiKey) return null;

  return new TuishDeveloperApi({
    apiKey,
    apiBaseUrl: ctx.config.getApiBaseUrl(),
  });
}

export async function productListCommand(
  ctx: PlatformContext,
): Promise<CommandResult<{ products: Product[] }>> {
  const api = getAuthenticatedApi(ctx);

  if (!api) {
    return {
      success: false,
      error: 'Not authenticated. Run `tuish login` first.',
      errorCode: ErrorCodes.NOT_AUTHENTICATED,
    };
  }

  try {
    const result = await api.listProducts();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof TuishApiError) {
      return {
        success: false,
        error: error.message,
        errorCode: ErrorCodes.API_ERROR,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list products',
      errorCode: ErrorCodes.API_ERROR,
    };
  }
}

export async function productCreateCommand(
  ctx: PlatformContext,
  options: CreateProductInput,
): Promise<CommandResult<{ product: Product }>> {
  const api = getAuthenticatedApi(ctx);

  if (!api) {
    return {
      success: false,
      error: 'Not authenticated. Run `tuish login` first.',
      errorCode: ErrorCodes.NOT_AUTHENTICATED,
    };
  }

  // Validate required fields
  if (!options.slug) {
    return {
      success: false,
      error: 'Product slug is required',
      errorCode: ErrorCodes.MISSING_REQUIRED,
    };
  }

  if (!options.name) {
    return {
      success: false,
      error: 'Product name is required',
      errorCode: ErrorCodes.MISSING_REQUIRED,
    };
  }

  if (options.priceCents === undefined || options.priceCents < 0) {
    return {
      success: false,
      error: 'Valid price is required',
      errorCode: ErrorCodes.MISSING_REQUIRED,
    };
  }

  try {
    const result = await api.createProduct(options);
    return {
      success: true,
      data: result,
      message: `Product "${result.product.name}" created successfully`,
    };
  } catch (error) {
    if (error instanceof TuishApiError) {
      return {
        success: false,
        error: error.message,
        errorCode: ErrorCodes.API_ERROR,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create product',
      errorCode: ErrorCodes.API_ERROR,
    };
  }
}

export async function productUpdateCommand(
  ctx: PlatformContext,
  productId: string,
  options: UpdateProductInput,
): Promise<CommandResult<{ product: Product }>> {
  const api = getAuthenticatedApi(ctx);

  if (!api) {
    return {
      success: false,
      error: 'Not authenticated. Run `tuish login` first.',
      errorCode: ErrorCodes.NOT_AUTHENTICATED,
    };
  }

  if (!productId) {
    return {
      success: false,
      error: 'Product ID is required',
      errorCode: ErrorCodes.MISSING_REQUIRED,
    };
  }

  try {
    const result = await api.updateProduct(productId, options);
    return {
      success: true,
      data: result,
      message: `Product "${result.product.name}" updated successfully`,
    };
  } catch (error) {
    if (error instanceof TuishApiError) {
      return {
        success: false,
        error: error.message,
        errorCode: ErrorCodes.API_ERROR,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product',
      errorCode: ErrorCodes.API_ERROR,
    };
  }
}
