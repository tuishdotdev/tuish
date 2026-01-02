import { Select, Spinner } from '@inkjs/ui';
import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { formatCurrency } from '../../lib/format.js';
import type { Product, ScreenProps } from '../../types.js';

export function ProductList({
	isInteractiveMode,
	navigate,
	goBack,
}: ScreenProps) {
	const { exit } = useApp();
	const { listProducts } = useApi();
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Only use keyboard input in interactive mode (TTY)
	useInput(
		(input, key) => {
			if (key.escape) goBack();
			if (input === 'n') navigate('products-create');
			if (input === 'q') exit();
		},
		{ isActive: isInteractiveMode },
	);

	useEffect(() => {
		listProducts()
			.then((data) => {
				setProducts(data.products);
				setLoading(false);
			})
			.catch((err) => {
				setError(
					err instanceof Error ? err.message : 'Failed to load products',
				);
				setLoading(false);
			});
	}, [listProducts]);

	if (loading) {
		return <Spinner label="Loading products..." />;
	}

	if (error) {
		return (
			<Box flexDirection="column" gap={1}>
				<Text color="red">Error: {error}</Text>
				{isInteractiveMode && <Text dimColor>Press Esc to go back</Text>}
			</Box>
		);
	}

	if (products.length === 0) {
		return (
			<Box flexDirection="column" gap={1}>
				<Text>No products yet.</Text>
				{isInteractiveMode ? (
					<Select
						options={[
							{ label: 'Create your first product', value: 'create' },
							{ label: 'Go back', value: 'back' },
						]}
						onChange={(value) => {
							if (value === 'create') {
								navigate('products-create');
							} else {
								goBack();
							}
						}}
					/>
				) : (
					<>
						<Text dimColor>
							Run `tuish products create` to create your first product.
						</Text>
						{setTimeout(() => exit(), 100) && null}
					</>
				)}
			</Box>
		);
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Text bold>Your Products ({products.length})</Text>
			<Box flexDirection="column" marginTop={1}>
				{products.map((product) => (
					<Box key={product.id} flexDirection="column" marginBottom={1}>
						<Box>
							<Text bold color="cyan">
								{product.name}
							</Text>
							<Text dimColor> ({product.slug})</Text>
						</Box>
						<Box paddingLeft={2}>
							<Text>
								{formatCurrency(product.priceCents, product.currency)}
							</Text>
							<Text dimColor> - {product.billingType}</Text>
						</Box>
						{product.description && (
							<Box paddingLeft={2}>
								<Text dimColor>{product.description}</Text>
							</Box>
						)}
						<Box paddingLeft={2}>
							<Text dimColor>ID: {product.id}</Text>
						</Box>
					</Box>
				))}
			</Box>
			{isInteractiveMode && (
				<Box marginTop={1} flexDirection="column">
					<Select
						options={[
							{ label: 'Create New Product', value: 'create' },
							{ label: 'Edit a Product', value: 'update' },
							{ label: 'Back to Dashboard', value: 'back' },
						]}
						onChange={(value) => {
							if (value === 'create') {
								navigate('products-create');
							} else if (value === 'update') {
								navigate('products-update');
							} else {
								goBack();
							}
						}}
					/>
					<Text dimColor>Shortcuts: n=new | Esc=back | q=quit</Text>
				</Box>
			)}
			{!isInteractiveMode && setTimeout(() => exit(), 100) && null}
		</Box>
	);
}
