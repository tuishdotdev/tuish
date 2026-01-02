import { Box, Text, useApp } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header.js';
import { useAuth } from './hooks/useAuth.js';
import type { CliFlags } from './index.js';
import { Connect } from './screens/Connect.js';
import { Dashboard } from './screens/Dashboard.js';
import { Login } from './screens/Login.js';
import { MainMenu } from './screens/MainMenu.js';
import { Signup } from './screens/Signup.js';
import { ProductCreate } from './screens/products/Create.js';
import { ProductList } from './screens/products/List.js';
import { ProductUpdate } from './screens/products/Update.js';

export type Screen =
	| 'main-menu'
	| 'signup'
	| 'login'
	| 'connect'
	| 'dashboard'
	| 'products-list'
	| 'products-create'
	| 'products-update';

type Props = {
	command?: string;
	subcommand?: string;
	flags?: CliFlags;
};

export function App({ command, subcommand, flags = {} as CliFlags }: Props) {
	const { exit } = useApp();
	const { isAuthenticated, apiKey, logout, login, isLoading } = useAuth();
	const logoutHandled = useRef(false);

	const isInteractiveMode = !command;

	const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
		if (command === 'signup') return 'signup';
		if (command === 'login') return 'login';
		if (command === 'connect') return 'connect';
		if (command === 'products') {
			if (subcommand === 'create') return 'products-create';
			if (subcommand === 'update') return 'products-update';
			return 'products-list';
		}
		return 'main-menu';
	});

	// Handle logout command in useEffect to prevent infinite re-renders
	useEffect(() => {
		if (command === 'logout' && !logoutHandled.current) {
			logoutHandled.current = true;
			logout();
		}
	}, [command, logout]);

	const navigate = useCallback((screen: Screen) => {
		setCurrentScreen(screen);
	}, []);

	const goBack = useCallback(() => {
		if (isAuthenticated) {
			setCurrentScreen('dashboard');
		} else {
			setCurrentScreen('main-menu');
		}
	}, [isAuthenticated]);

	const handleLogout = useCallback(() => {
		logout();
		if (isInteractiveMode) {
			setCurrentScreen('main-menu');
		} else {
			exit();
		}
	}, [logout, isInteractiveMode, exit]);

	const handleAuthSuccess = useCallback(
		(newApiKey: string) => {
			login(newApiKey);
			if (isInteractiveMode) {
				setCurrentScreen('dashboard');
			}
		},
		[login, isInteractiveMode],
	);

	if (isLoading) {
		return (
			<Box flexDirection="column" padding={1}>
				<Header />
				<Text dimColor>Loading...</Text>
			</Box>
		);
	}

	if (command === 'logout') {
		return (
			<Box flexDirection="column" padding={1}>
				<Header />
				<Text color="green">Logged out successfully.</Text>
			</Box>
		);
	}

	if (command === 'whoami') {
		return (
			<Box flexDirection="column" padding={1}>
				<Header />
				{isAuthenticated ? (
					<Text>Authenticated with API key: {apiKey?.slice(0, 20)}...</Text>
				) : (
					<Text color="yellow">
						Not logged in. Run `tuish login` to authenticate.
					</Text>
				)}
			</Box>
		);
	}

	const protectedScreens: Screen[] = [
		'connect',
		'products-list',
		'products-create',
		'products-update',
	];
	if (!isAuthenticated && protectedScreens.includes(currentScreen)) {
		if (!isInteractiveMode) {
			return (
				<Box flexDirection="column" padding={1}>
					<Header />
					<Text color="red">Please login first: tuish login</Text>
				</Box>
			);
		}
	}

	const effectiveScreen =
		isInteractiveMode && !isLoading
			? isAuthenticated &&
				currentScreen !== 'signup' &&
				currentScreen !== 'login' &&
				currentScreen !== 'main-menu'
				? currentScreen
				: isAuthenticated
					? 'dashboard'
					: currentScreen
			: currentScreen;

	const screenProps = {
		isInteractiveMode,
		navigate,
		goBack,
		onAuthSuccess: handleAuthSuccess,
		onLogout: handleLogout,
		flags,
	};

	const renderScreen = () => {
		switch (effectiveScreen) {
			case 'main-menu':
				return <MainMenu {...screenProps} />;
			case 'signup':
				return <Signup {...screenProps} />;
			case 'login':
				return <Login {...screenProps} />;
			case 'connect':
				return <Connect {...screenProps} />;
			case 'dashboard':
				return <Dashboard {...screenProps} />;
			case 'products-list':
				return <ProductList {...screenProps} />;
			case 'products-create':
				return <ProductCreate {...screenProps} />;
			case 'products-update':
				return <ProductUpdate {...screenProps} />;
			default:
				return <MainMenu {...screenProps} />;
		}
	};

	return (
		<Box flexDirection="column" padding={1}>
			<Header />
			{renderScreen()}
		</Box>
	);
}
