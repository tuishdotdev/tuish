import { useCallback } from 'react';
import { TuishDeveloperApi } from '../lib/api.js';
import type { CreateProductInput, UpdateProductInput } from '../types.js';
import { useConfig } from './useConfig.js';

export function useApi() {
	const { getApiKey, getApiBaseUrl } = useConfig();

	const getClient = useCallback(() => {
		const apiKey = getApiKey();
		const apiBaseUrl = getApiBaseUrl();
		return new TuishDeveloperApi({ apiKey, apiBaseUrl });
	}, [getApiKey, getApiBaseUrl]);

	const signup = useCallback(async (data: { email: string; name?: string }) => {
		const client = new TuishDeveloperApi({});
		return client.signup(data);
	}, []);

	const validateApiKey = useCallback(async (key: string) => {
		const client = new TuishDeveloperApi({ apiKey: key });
		return client.listProducts();
	}, []);

	const listProducts = useCallback(async () => {
		const client = getClient();
		return client.listProducts();
	}, [getClient]);

	const createProduct = useCallback(
		async (data: CreateProductInput) => {
			const client = getClient();
			return client.createProduct(data);
		},
		[getClient],
	);

	const updateProduct = useCallback(
		async (id: string, data: UpdateProductInput) => {
			const client = getClient();
			return client.updateProduct(id, data);
		},
		[getClient],
	);

	const getConnectStatus = useCallback(async () => {
		const client = getClient();
		return client.getConnectStatus();
	}, [getClient]);

	const startConnect = useCallback(async () => {
		const client = getClient();
		return client.startConnect();
	}, [getClient]);

	return {
		signup,
		validateApiKey,
		listProducts,
		createProduct,
		updateProduct,
		getConnectStatus,
		startConnect,
	};
}
