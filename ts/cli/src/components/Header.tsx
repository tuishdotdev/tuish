import { Box, Text } from 'ink';

export function Header() {
	return (
		<Box marginBottom={1}>
			<Text bold color="cyan">
				tuish
			</Text>
			<Text dimColor> - TUI monetization platform</Text>
		</Box>
	);
}
