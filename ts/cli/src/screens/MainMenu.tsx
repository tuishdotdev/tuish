import { Select } from '@inkjs/ui';
import { Box, Text, useApp, useInput } from 'ink';
import type { Screen } from '../app.js';
import type { ScreenProps } from '../types.js';

export function MainMenu({ navigate, isInteractiveMode }: ScreenProps) {
	const { exit } = useApp();

	// Only use keyboard input in interactive mode (TTY)
	useInput(
		(input, key) => {
			if (input === 'q' || (key.ctrl && input === 'c')) {
				exit();
			}
		},
		{ isActive: isInteractiveMode },
	);

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column" marginBottom={1}>
				<Text bold>Welcome to tuish</Text>
				<Text dimColor>
					Monetize your TUI apps with one browser visit, then never again.
				</Text>
			</Box>

			<Text>What would you like to do?</Text>
			<Select
				options={[
					{ label: 'Create a new account', value: 'signup' },
					{ label: 'Log in with API key', value: 'login' },
					{ label: 'Exit', value: 'exit' },
				]}
				onChange={(value) => {
					if (value === 'exit') {
						exit();
					} else {
						navigate(value as Screen);
					}
				}}
			/>

			<Box marginTop={1}>
				<Text dimColor>
					Press q to quit | Use arrows to navigate | Enter to select
				</Text>
			</Box>
		</Box>
	);
}
