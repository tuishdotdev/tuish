import { Select, Spinner, TextInput } from '@inkjs/ui';
import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { formatCurrency } from '../../lib/format.js';
import type { Product, ScreenProps } from '../../types.js';

type Step =
	| 'name'
	| 'slug'
	| 'description'
	| 'price'
	| 'billing'
	| 'confirm'
	| 'submitting'
	| 'success'
	| 'error';

type FormData = {
	name: string;
	slug: string;
	description: string;
	priceCents: number;
	billingType: 'one_time' | 'subscription';
};

export function ProductCreate({
	isInteractiveMode,
	navigate,
	goBack,
	flags = {},
}: ScreenProps) {
	const { exit } = useApp();
	const { createProduct } = useApi();
	const flagsHandled = useRef(false);

	const [step, setStep] = useState<Step>('name');
	const [formData, setFormData] = useState<FormData>({
		name: '',
		slug: '',
		description: '',
		priceCents: 0,
		billingType: 'one_time',
	});
	const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
	const [error, setError] = useState('');

	// Only use keyboard input in interactive mode (TTY)
	useInput(
		(_input, key) => {
			if (key.escape && step !== 'submitting') {
				goBack();
			}
		},
		{ isActive: isInteractiveMode },
	);

	// Handle non-interactive mode with flags
	useEffect(() => {
		if (
			!isInteractiveMode &&
			flags.name &&
			flags.slug &&
			flags.price &&
			!flagsHandled.current
		) {
			flagsHandled.current = true;
			handleFlagsCreate();
		}
	}, [flags, isInteractiveMode]);

	const handleFlagsCreate = async () => {
		const dollars = Number.parseFloat(flags.price || '0');
		if (Number.isNaN(dollars) || dollars < 1) {
			setError('Invalid price. Minimum $1.00');
			setStep('error');
			return;
		}

		const billingType =
			flags.billing === 'subscription' ? 'subscription' : 'one_time';

		setStep('submitting');
		try {
			const result = await createProduct({
				name: flags.name!,
				slug: flags.slug!,
				description: flags.desc || undefined,
				priceCents: Math.round(dollars * 100),
				billingType,
				currency: 'usd',
			});
			setCreatedProduct(result.product);
			setStep('success');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create product');
			setStep('error');
		}
	};

	const updateField = <K extends keyof FormData>(
		field: K,
		value: FormData[K],
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async () => {
		setStep('submitting');
		try {
			const result = await createProduct({
				name: formData.name,
				slug: formData.slug,
				description: formData.description || undefined,
				priceCents: formData.priceCents,
				billingType: formData.billingType,
				currency: 'usd',
			});
			setCreatedProduct(result.product);
			setStep('success');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create product');
			setStep('error');
		}
	};

	// Non-interactive mode without required flags
	if (
		!isInteractiveMode &&
		(!flags.name || !flags.slug || !flags.price) &&
		step === 'name'
	) {
		const missing = [];
		if (!flags.name) missing.push('--name');
		if (!flags.slug) missing.push('-s/--slug');
		if (!flags.price) missing.push('-p/--price');
		return (
			<Box flexDirection="column" gap={1}>
				<Text color="red">
					Error: Missing required flags: {missing.join(', ')}
				</Text>
				<Text dimColor>
					Usage: tuish products create --name "My App" -s my-app -p 29.99
				</Text>
				{setTimeout(() => exit(), 100) && null}
			</Box>
		);
	}

	// Non-interactive mode with flags - show loading while useEffect runs
	if (
		!isInteractiveMode &&
		flags.name &&
		flags.slug &&
		flags.price &&
		step === 'name'
	) {
		return <Spinner label="Creating product..." />;
	}

	if (step === 'name') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Create a new product</Text>
				<Box>
					<Text>Product Name: </Text>
					<TextInput
						placeholder="My Awesome TUI"
						onSubmit={(value) => {
							updateField('name', value);
							const slug = value
								.toLowerCase()
								.replace(/[^a-z0-9]+/g, '-')
								.replace(/^-|-$/g, '');
							updateField('slug', slug);
							setStep('slug');
						}}
					/>
				</Box>
				{isInteractiveMode && <Text dimColor>Press Esc to go back</Text>}
			</Box>
		);
	}

	if (step === 'slug') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Create a new product</Text>
				<Text dimColor>Name: {formData.name}</Text>
				<Box>
					<Text>URL Slug: </Text>
					<TextInput
						defaultValue={formData.slug}
						placeholder="my-awesome-tui"
						onSubmit={(value) => {
							updateField('slug', value);
							setStep('description');
						}}
					/>
				</Box>
				<Text dimColor>Lowercase letters, numbers, and hyphens only</Text>
			</Box>
		);
	}

	if (step === 'description') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Create a new product</Text>
				<Text dimColor>Name: {formData.name}</Text>
				<Text dimColor>Slug: {formData.slug}</Text>
				<Box>
					<Text>Description (optional): </Text>
					<TextInput
						placeholder="A brief description..."
						onSubmit={(value) => {
							updateField('description', value);
							setStep('price');
						}}
					/>
				</Box>
				<Text dimColor>Press Enter to skip</Text>
			</Box>
		);
	}

	if (step === 'price') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Create a new product</Text>
				<Text dimColor>Name: {formData.name}</Text>
				<Text dimColor>Slug: {formData.slug}</Text>
				{formData.description && (
					<Text dimColor>Description: {formData.description}</Text>
				)}
				<Box>
					<Text>Price (in dollars, e.g., 29.99): $</Text>
					<TextInput
						placeholder="29.99"
						onSubmit={(value) => {
							const dollars = Number.parseFloat(value);
							if (Number.isNaN(dollars) || dollars < 1) {
								return;
							}
							updateField('priceCents', Math.round(dollars * 100));
							setStep('billing');
						}}
					/>
				</Box>
				<Text dimColor>Minimum $1.00</Text>
			</Box>
		);
	}

	if (step === 'billing') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Create a new product</Text>
				<Text dimColor>Name: {formData.name}</Text>
				<Text dimColor>Slug: {formData.slug}</Text>
				<Text dimColor>
					Price: {formatCurrency(formData.priceCents, 'usd')}
				</Text>
				<Text>Billing Type:</Text>
				<Select
					options={[
						{ label: 'One-time purchase', value: 'one_time' },
						{ label: 'Subscription (recurring)', value: 'subscription' },
					]}
					onChange={(value) => {
						updateField('billingType', value as 'one_time' | 'subscription');
						setStep('confirm');
					}}
				/>
			</Box>
		);
	}

	if (step === 'confirm') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Confirm product details</Text>
				<Box
					flexDirection="column"
					paddingX={2}
					marginY={1}
					borderStyle="round"
				>
					<Text>
						Name: <Text bold>{formData.name}</Text>
					</Text>
					<Text>
						Slug: <Text bold>{formData.slug}</Text>
					</Text>
					{formData.description && (
						<Text>Description: {formData.description}</Text>
					)}
					<Text>
						Price:{' '}
						<Text bold color="green">
							{formatCurrency(formData.priceCents, 'usd')}
						</Text>
					</Text>
					<Text>
						Billing:{' '}
						<Text bold>
							{formData.billingType === 'one_time'
								? 'One-time'
								: 'Subscription'}
						</Text>
					</Text>
				</Box>
				<Text>Create this product?</Text>
				<Select
					options={[
						{ label: 'Yes, create it', value: 'yes' },
						{ label: 'No, cancel', value: 'no' },
					]}
					onChange={(value) => {
						if (value === 'yes') {
							handleSubmit();
						} else if (isInteractiveMode) {
							goBack();
						} else {
							exit();
						}
					}}
				/>
			</Box>
		);
	}

	if (step === 'submitting') {
		return <Spinner label="Creating product..." />;
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
								setStep('name');
								setError('');
							} else {
								goBack();
							}
						}}
					/>
				) : (
					<>
						<Text dimColor>Press Ctrl+C to exit and try again.</Text>
						{setTimeout(() => exit(), 100) && null}
					</>
				)}
			</Box>
		);
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Text color="green" bold>
				Product created successfully!
			</Text>
			<Box
				flexDirection="column"
				paddingX={2}
				marginTop={1}
				borderStyle="round"
				borderColor="green"
			>
				<Text>
					ID: <Text bold>{createdProduct?.id}</Text>
				</Text>
				<Text>Name: {createdProduct?.name}</Text>
				<Text>
					Price:{' '}
					{createdProduct
						? formatCurrency(createdProduct.priceCents, createdProduct.currency)
						: ''}
				</Text>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>Use this product ID in your SDK configuration.</Text>
			</Box>
			{isInteractiveMode ? (
				<Select
					options={[
						{ label: 'Create another product', value: 'another' },
						{ label: 'View all products', value: 'list' },
						{ label: 'Back to Dashboard', value: 'dashboard' },
					]}
					onChange={(value) => {
						if (value === 'another') {
							setStep('name');
							setFormData({
								name: '',
								slug: '',
								description: '',
								priceCents: 0,
								billingType: 'one_time',
							});
							setCreatedProduct(null);
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
