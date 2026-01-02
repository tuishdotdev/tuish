import { Select, Spinner, TextInput } from '@inkjs/ui';
import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useRef, useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useConfig } from '../hooks/useConfig.js';
import type { ScreenProps } from '../types.js';

type Step = 'input' | 'validating' | 'success' | 'error';

export function Login({
	isInteractiveMode,
	onAuthSuccess,
	goBack,
	flags = {},
}: ScreenProps) {
	const { exit } = useApp();
	const { validateApiKey } = useApi();
	const { saveApiKey } = useConfig();
	const flagsHandled = useRef(false);

	const [step, setStep] = useState<Step>('input');
	const [error, setError] = useState('');

	// Only use keyboard input in interactive mode (TTY)
	useInput(
		(_input, key) => {
			if (key.escape && step !== 'validating') {
				goBack();
			}
		},
		{ isActive: isInteractiveMode },
	);

	// Handle non-interactive mode with flags
	useEffect(() => {
		if (!isInteractiveMode && flags.key && !flagsHandled.current) {
			flagsHandled.current = true;
			handleSubmit(flags.key);
		}
	}, [flags.key, isInteractiveMode]);

	const handleSubmit = async (key: string) => {
		if (!key.startsWith('tuish_sk_')) {
			setError('Invalid API key format. Keys start with tuish_sk_');
			setStep('error');
			return;
		}

		setStep('validating');

		try {
			await validateApiKey(key);
			saveApiKey(key);
			onAuthSuccess(key);
			setStep('success');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Invalid API key');
			setStep('error');
		}
	};

	// Non-interactive mode without required flags
	if (!isInteractiveMode && !flags.key && step === 'input') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text color="red">
					Error: API key required. Use: tuish login -k tuish_sk_xxx
				</Text>
				{setTimeout(() => exit(), 100) && null}
			</Box>
		);
	}

	// Non-interactive mode with flags - show loading while useEffect runs
	if (!isInteractiveMode && flags.key && step === 'input') {
		return <Spinner label="Validating API key..." />;
	}

	if (step === 'input') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Log in with your API key</Text>
				<Box>
					<Text>API Key: </Text>
					<TextInput placeholder="tuish_sk_..." onSubmit={handleSubmit} />
				</Box>
				{isInteractiveMode && <Text dimColor>Press Esc to go back</Text>}
			</Box>
		);
	}

	if (step === 'validating') {
		return <Spinner label="Validating API key..." />;
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
								setStep('input');
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
				Logged in successfully!
			</Text>
			{!isInteractiveMode && (
				<>
					<Text dimColor>Run `tuish` to open the dashboard.</Text>
					{setTimeout(() => exit(), 100) && null}
				</>
			)}
		</Box>
	);
}
