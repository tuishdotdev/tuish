import { Select, Spinner, TextInput } from '@inkjs/ui';
import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useRef, useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useConfig } from '../hooks/useConfig.js';
import type { ScreenProps } from '../types.js';

type Step = 'email' | 'name' | 'submitting' | 'success' | 'error';

export function Signup({
	isInteractiveMode,
	onAuthSuccess,
	goBack,
	flags = {},
}: ScreenProps) {
	const { exit } = useApp();
	const { signup } = useApi();
	const { saveApiKey } = useConfig();
	const flagsHandled = useRef(false);

	const [step, setStep] = useState<Step>('email');
	const [email, setEmail] = useState('');
	const [apiKey, setApiKey] = useState('');
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
		if (!isInteractiveMode && flags.email && !flagsHandled.current) {
			flagsHandled.current = true;
			handleFlagsSignup(flags.email, flags.name);
		}
	}, [flags.email, flags.name, isInteractiveMode]);

	const handleFlagsSignup = async (
		signupEmail: string,
		signupName?: string,
	) => {
		setStep('submitting');
		try {
			const result = await signup({ email: signupEmail, name: signupName });
			setApiKey(result.apiKey);
			saveApiKey(result.apiKey);
			onAuthSuccess(result.apiKey);
			setStep('success');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Signup failed');
			setStep('error');
		}
	};

	const handleEmailSubmit = (value: string) => {
		if (!value.includes('@')) {
			setError('Please enter a valid email');
			setStep('error');
			return;
		}
		setEmail(value);
		setStep('name');
	};

	const handleNameSubmit = async (value: string) => {
		setStep('submitting');

		try {
			const result = await signup({ email, name: value || undefined });
			setApiKey(result.apiKey);
			saveApiKey(result.apiKey);
			onAuthSuccess(result.apiKey);
			setStep('success');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Signup failed');
			setStep('error');
		}
	};

	// Non-interactive mode without required flags
	if (!isInteractiveMode && !flags.email && step === 'email') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text color="red">
					Error: Email required. Use: tuish signup -e your@email.com
				</Text>
				{setTimeout(() => exit(), 100) && null}
			</Box>
		);
	}

	// Non-interactive mode with flags - show loading while useEffect runs
	if (
		!isInteractiveMode &&
		flags.email &&
		(step === 'email' || step === 'name')
	) {
		return <Spinner label="Creating your account..." />;
	}

	if (step === 'email') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Create your developer account</Text>
				<Box>
					<Text>Email: </Text>
					<TextInput
						placeholder="you@example.com"
						onSubmit={handleEmailSubmit}
					/>
				</Box>
				{isInteractiveMode && <Text dimColor>Press Esc to go back</Text>}
			</Box>
		);
	}

	if (step === 'name') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold>Create your developer account</Text>
				<Text dimColor>Email: {email}</Text>
				<Box>
					<Text>Name (optional): </Text>
					<TextInput placeholder="Your Name" onSubmit={handleNameSubmit} />
				</Box>
				<Text dimColor>Press Enter to skip | Esc to go back</Text>
			</Box>
		);
	}

	if (step === 'submitting') {
		return (
			<Box>
				<Spinner label="Creating your account..." />
			</Box>
		);
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
								setStep('email');
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
				Account created successfully!
			</Text>
			<Box
				flexDirection="column"
				marginTop={1}
				paddingX={2}
				borderStyle="round"
				borderColor="green"
			>
				<Text>Your API Key (save this - it will not be shown again):</Text>
				<Text bold color="yellow">
					{apiKey}
				</Text>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>This key has been saved to ~/.tuish/config.json</Text>
			</Box>
			{isInteractiveMode ? (
				<Select
					options={[
						{ label: 'Go to Dashboard', value: 'dashboard' },
						{ label: 'Create a Product', value: 'create' },
					]}
					onChange={() => {
						// onAuthSuccess already called, navigation handled by parent
					}}
				/>
			) : (
				<>
					<Text dimColor>Run `tuish` to open the dashboard.</Text>
					{setTimeout(() => exit(), 100) && null}
				</>
			)}
		</Box>
	);
}
