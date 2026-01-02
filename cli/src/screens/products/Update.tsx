import { Select, Spinner, TextInput } from '@inkjs/ui';
import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { formatCurrency } from '../../lib/format.js';
import type { Product, ScreenProps } from '../../types.js';

type Step =
	| 'loading'
	| 'select'
	| 'field'
	| 'value'
	| 'submitting'
	| 'success'
	| 'error';

export function ProductUpdate({
	isInteractiveMode,
	navigate,
	goBack,
}: ScreenProps) {
	const { exit } = useApp();
	const { listProducts, updateProduct } = useApi();

	const [step, setStep] = useState<Step>('loading');
	const [products, setProducts] = useState<Product[]>([]);
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const [selectedField, setSelectedField] = useState<string>('');
	const [error, setError] = useState('');

	// Only use keyboard input in interactive mode (TTY)
	useInput(
		(_input, key) => {
			if (key.escape && step !== 'submitting' && step !== 'loading') {
				goBack();
			}
		},
		{ isActive: isInteractiveMode },
	);

	useEffect(() => {
		listProducts()
			.then((data) => {
				setProducts(data.products);
				setStep('select');
			})
			.catch((err) => {
				setError(
					err instanceof Error ? err.message : 'Failed to load products',
				);
				setStep('error');
			});
	}, [listProducts]);

	if (step === 'loading') {
		return <Spinner label="Loading products..." />;
	}

	if (step === 'error' && products.length === 0) {
		return (
			<Box flexDirection="column" gap={1}>
				<Text color="red">Error: {error}</Text>
				{isInteractiveMode && <Text dimColor>Press Esc to go back</Text>}
			</Box>
		);
	}

	if (products.length === 0 && step === 'select') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text>No products to update.</Text>
				{isInteractiveMode ? (
					<Select
						options={[
							{ label: 'Create a product first', value: 'create' },
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
						<Text dimColor>Run `tuish products create` first.</Text>
						{setTimeout(() => exit(), 100) && null}
					</>
				)}
			</Box>
		);
	}

	if (step === 'select') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Select a product to update</Text>
				<Select
					options={products.map((p) => ({
						label: `${p.name} (${formatCurrency(p.priceCents, p.currency)})`,
						value: p.id,
					}))}
					onChange={(value) => {
						const product = products.find((p) => p.id === value);
						if (product) {
							setSelectedProduct(product);
							setStep('field');
						}
					}}
				/>
				{isInteractiveMode && <Text dimColor>Press Esc to go back</Text>}
			</Box>
		);
	}

	if (step === 'field' && selectedProduct) {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Updating: {selectedProduct.name}</Text>
				<Text>What would you like to update?</Text>
				<Select
					options={[
						{ label: `Name (current: ${selectedProduct.name})`, value: 'name' },
						{
							label: `Description (current: ${selectedProduct.description || 'none'})`,
							value: 'description',
						},
						{
							label: `Price (current: ${formatCurrency(selectedProduct.priceCents, selectedProduct.currency)})`,
							value: 'priceCents',
						},
					]}
					onChange={(value) => {
						setSelectedField(value);
						setStep('value');
					}}
				/>
			</Box>
		);
	}

	if (step === 'value' && selectedProduct) {
		const handleValueSubmit = async (value: string) => {
			setStep('submitting');
			try {
				const updateData: Record<string, unknown> = {};

				if (selectedField === 'name') {
					updateData.name = value;
				} else if (selectedField === 'description') {
					updateData.description = value || null;
				} else if (selectedField === 'priceCents') {
					const dollars = Number.parseFloat(value);
					if (Number.isNaN(dollars) || dollars < 1) {
						setError('Invalid price. Minimum $1.00');
						setStep('error');
						return;
					}
					updateData.priceCents = Math.round(dollars * 100);
				}

				await updateProduct(selectedProduct.id, updateData);
				setStep('success');
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Update failed');
				setStep('error');
			}
		};

		const placeholder =
			selectedField === 'priceCents'
				? '29.99'
				: selectedField === 'name'
					? selectedProduct.name
					: selectedProduct.description || '';

		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Updating: {selectedProduct.name}</Text>
				<Text>Field: {selectedField}</Text>
				<Box>
					<Text>New value: </Text>
					<TextInput placeholder={placeholder} onSubmit={handleValueSubmit} />
				</Box>
			</Box>
		);
	}

	if (step === 'submitting') {
		return <Spinner label="Updating product..." />;
	}

	if (step === 'error') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text color="red">Error: {error}</Text>
				{isInteractiveMode ? (
					<Select
						options={[
							{ label: 'Try again', value: 'retry' },
							{ label: 'Go back', value: 'back' },
						]}
						onChange={(value) => {
							if (value === 'retry') {
								setStep('select');
								setError('');
							} else {
								goBack();
							}
						}}
					/>
				) : (
					<Text dimColor>Press Ctrl+C to exit and try again.</Text>
				)}
			</Box>
		);
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Text color="green" bold>
				Product updated successfully!
			</Text>
			{isInteractiveMode ? (
				<Select
					options={[
						{ label: 'Update another field', value: 'another' },
						{ label: 'View all products', value: 'list' },
						{ label: 'Back to Dashboard', value: 'dashboard' },
					]}
					onChange={(value) => {
						if (value === 'another') {
							setStep('field');
						} else if (value === 'list') {
							navigate('products-list');
						} else {
							goBack();
						}
					}}
				/>
			) : (
				<>
					<Text dimColor>Run `tuish products` to view all products.</Text>
					{setTimeout(() => exit(), 100) && null}
				</>
			)}
		</Box>
	);
}
