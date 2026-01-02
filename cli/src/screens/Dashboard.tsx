import { Select, Spinner } from '@inkjs/ui';
import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useState } from 'react';
import type { Screen } from '../app.js';
import { useApi } from '../hooks/useApi.js';
import { useConfig } from '../hooks/useConfig.js';
import type { ScreenProps } from '../types.js';

export function Dashboard({
	navigate,
	onLogout,
	isInteractiveMode,
}: ScreenProps) {
	const { exit } = useApp();
	const { listProducts } = useApi();
	const { getApiKey } = useConfig();
	const [productCount, setProductCount] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [showApiKey, setShowApiKey] = useState(false);

	useEffect(() => {
		listProducts()
			.then((data) => {
				setProductCount(data.products.length);
				setLoading(false);
			})
			.catch(() => {
				setProductCount(0);
				setLoading(false);
			});
	}, [listProducts]);

	// Only use keyboard input in interactive mode (TTY)
	useInput(
		(input) => {
			if (input === 'q') exit();
			if (input === 'n') navigate('products-create');
			if (input === 'p') navigate('products-list');
		},
		{ isActive: isInteractiveMode },
	);

	const apiKey = getApiKey();

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column" marginBottom={1}>
				<Text bold color="green">
					Dashboard
				</Text>
				{loading ? (
					<Spinner label="Loading..." />
				) : (
					<Text dimColor>
						{productCount === 0
							? 'No products yet. Create your first one!'
							: `${productCount} product${productCount === 1 ? '' : 's'}`}
					</Text>
				)}
			</Box>

			{showApiKey && apiKey && (
				<Box
					flexDirection="column"
					marginBottom={1}
					paddingX={2}
					borderStyle="round"
					borderColor="yellow"
				>
					<Text>Your API Key:</Text>
					<Text bold color="yellow">
						{apiKey}
					</Text>
				</Box>
			)}

			<Select
				options={[
					{ label: 'View Products', value: 'products-list' },
					{ label: 'Create New Product', value: 'products-create' },
					{
						label: showApiKey ? 'Hide API Key' : 'Show API Key',
						value: 'toggle-key',
					},
					{ label: 'Log Out', value: 'logout' },
					{ label: 'Exit', value: 'exit' },
				]}
				onChange={(value) => {
					if (value === 'exit') {
						exit();
					} else if (value === 'logout') {
						onLogout();
					} else if (value === 'toggle-key') {
						setShowApiKey(!showApiKey);
					} else {
						navigate(value as Screen);
					}
				}}
			/>

			<Box marginTop={1} flexDirection="column">
				<Text dimColor>Shortcuts: n=new product | p=products | q=quit</Text>
			</Box>
		</Box>
	);
}
