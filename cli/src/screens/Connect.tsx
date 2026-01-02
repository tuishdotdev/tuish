import { Spinner } from '@inkjs/ui';
import { Box, Text, useApp, useInput } from 'ink';
import open from 'open';
import { useEffect, useRef, useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import type { ScreenProps } from '../types.js';

type Step = 'checking' | 'not-connected' | 'opening' | 'waiting' | 'connected' | 'error';

export function Connect({
	isInteractiveMode,
	goBack,
}: ScreenProps) {
	const { exit } = useApp();
	const { getConnectStatus, startConnect } = useApi();
	const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
	const hasStarted = useRef(false);

	const [step, setStep] = useState<Step>('checking');
	const [error, setError] = useState('');
	const [accountId, setAccountId] = useState<string | null>(null);

	useInput(
		(_input, key) => {
			if (key.escape && step !== 'waiting' && step !== 'opening') {
				goBack();
			}
		},
		{ isActive: isInteractiveMode },
	);

	// Check initial status
	useEffect(() => {
		const checkStatus = async () => {
			try {
				const status = await getConnectStatus();
				if (status.connected) {
					setAccountId(status.accountId);
					setStep('connected');
				} else {
					setStep('not-connected');
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to check status');
				setStep('error');
			}
		};
		checkStatus();
	}, [getConnectStatus]);

	// Auto-start for non-interactive mode
	useEffect(() => {
		if (!isInteractiveMode && step === 'not-connected' && !hasStarted.current) {
			hasStarted.current = true;
			handleConnect();
		}
	}, [isInteractiveMode, step]);

	// Cleanup polling on unmount
	useEffect(() => {
		return () => {
			if (pollInterval.current) {
				clearInterval(pollInterval.current);
			}
		};
	}, []);

	const handleConnect = async () => {
		setStep('opening');
		try {
			const { authUrl } = await startConnect();
			await open(authUrl);
			setStep('waiting');

			// Poll for connection status
			pollInterval.current = setInterval(async () => {
				try {
					const status = await getConnectStatus();
					if (status.connected) {
						if (pollInterval.current) {
							clearInterval(pollInterval.current);
						}
						setAccountId(status.accountId);
						setStep('connected');
					}
				} catch {
					// Ignore polling errors
				}
			}, 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to start connection');
			setStep('error');
		}
	};

	if (step === 'checking') {
		return <Spinner label="Checking Stripe connection status..." />;
	}

	if (step === 'connected') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text color="green" bold>
					✓ Stripe Connected
				</Text>
				<Text>Account ID: {accountId}</Text>
				<Text dimColor>
					{isInteractiveMode
						? 'Press Esc to go back'
						: 'You can now create products!'}
				</Text>
				{!isInteractiveMode && setTimeout(() => exit(), 100) && null}
			</Box>
		);
	}

	if (step === 'error') {
		return (
			<Box flexDirection="column" gap={1}>
				<Text color="red">Error: {error}</Text>
				{isInteractiveMode && <Text dimColor>Press Esc to go back</Text>}
				{!isInteractiveMode && setTimeout(() => exit(), 100) && null}
			</Box>
		);
	}

	if (step === 'opening') {
		return <Spinner label="Opening Stripe Connect..." />;
	}

	if (step === 'waiting') {
		return (
			<Box flexDirection="column" gap={1}>
				<Spinner label="Waiting for Stripe connection..." />
				<Text dimColor>Complete the connection in your browser.</Text>
				<Text dimColor>This will update automatically when connected.</Text>
			</Box>
		);
	}

	// not-connected state
	return (
		<Box flexDirection="column" gap={1}>
			<Text bold>Connect Your Stripe Account</Text>
			<Text>
				To sell products and receive payments, you need to connect your Stripe
				account.
			</Text>
			<Box marginTop={1}>
				<Text>
					Press <Text bold color="cyan">Enter</Text> to open Stripe Connect in
					your browser.
				</Text>
			</Box>
			{isInteractiveMode && (
				<Box marginTop={1}>
					<Text dimColor>Press Esc to go back</Text>
				</Box>
			)}
			{useConnectOnEnter(handleConnect, isInteractiveMode)}
		</Box>
	);
}

// Helper component to handle Enter key press
function useConnectOnEnter(
	onConnect: () => void,
	isActive: boolean,
): null {
	useInput(
		(_input, key) => {
			if (key.return) {
				onConnect();
			}
		},
		{ isActive },
	);
	return null;
}
