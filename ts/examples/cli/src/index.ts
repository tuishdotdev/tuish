import { Tuish, type LicenseCheckResult, type SavedCard } from '@tuish/sdk';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';

// Configuration - replace with your actual product ID and public key
const PRODUCT_ID = 'prod_example_pomodoro';
const PUBLIC_KEY = 'MCowBQYDK2VwAyEApm7UJOsmziMwDecofWxjtarMmApdkrKIOGMnFIIkXIY=';
const API_KEY = process.env.TUISH_API_KEY || 'tuish_sk_f503e39f69b329dea62ed78c97b68e5e30a04de9ecdf7ed1';

// Pomodoro timer settings
const WORK_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;
const SESSIONS_BEFORE_LONG_BREAK = 4;

/**
 * Initialize the tuish SDK
 */
function createTuishClient(): Tuish {
	return new Tuish({
		productId: PRODUCT_ID,
		publicKey: PUBLIC_KEY,
		apiKey: API_KEY,
		debug: process.env.TUISH_DEBUG === 'true',
	});
}

/**
 * Display the app header
 */
function showHeader(): void {
	console.log();
	console.log(chalk.bold.cyan('  ____                           _                '));
	console.log(chalk.bold.cyan(' |  _ \\ ___  _ __ ___   ___   __| | ___  _ __ ___ '));
	console.log(chalk.bold.cyan(' | |_) / _ \\| \'_ ` _ \\ / _ \\ / _` |/ _ \\| \'__/ _ \\'));
	console.log(chalk.bold.cyan(' |  __/ (_) | | | | | | (_) | (_| | (_) | | | (_) |'));
	console.log(chalk.bold.cyan(' |_|   \\___/|_| |_| |_|\\___/ \\__,_|\\___/|_|  \\___/'));
	console.log();
	console.log(chalk.gray('  A simple pomodoro timer for focused work sessions'));
	console.log();
}

/**
 * Format time as MM:SS
 */
function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Display license status
 */
function showLicenseStatus(result: LicenseCheckResult): void {
	if (result.valid) {
		console.log(
			chalk.green('  ✓ License valid') +
				(result.offlineVerified ? chalk.gray(' (verified offline)') : '')
		);

		if (result.license) {
			if (result.license.expiresAt) {
				const expiresDate = new Date(result.license.expiresAt);
				console.log(chalk.gray(`    Expires: ${expiresDate.toLocaleDateString()}`));
			} else {
				console.log(chalk.gray('    Perpetual license'));
			}

			if (result.license.features.length > 0) {
				console.log(chalk.gray(`    Features: ${result.license.features.join(', ')}`));
			}
		}
	} else {
		console.log(chalk.red(`  ✗ No valid license (${result.reason ?? 'not found'})`));
	}
	console.log();
}

/**
 * Handle the purchase flow
 */
async function handlePurchase(tuish: Tuish): Promise<boolean> {
	console.log(chalk.yellow('  This app requires a license to use.'));
	console.log();

	const { purchaseMethod } = await prompts({
		type: 'select',
		name: 'purchaseMethod',
		message: 'How would you like to purchase?',
		choices: [
			{ title: 'Open browser for checkout', value: 'browser' },
			{ title: 'Use saved card (returning customer)', value: 'terminal' },
			{ title: 'Enter license key', value: 'key' },
			{ title: 'Exit', value: 'exit' },
		],
	});

	if (purchaseMethod === 'exit' || !purchaseMethod) {
		return false;
	}

	if (purchaseMethod === 'key') {
		return handleLicenseKeyEntry(tuish);
	}

	if (purchaseMethod === 'browser') {
		return handleBrowserPurchase(tuish);
	}

	if (purchaseMethod === 'terminal') {
		return handleTerminalPurchase(tuish);
	}

	return false;
}

/**
 * Handle manual license key entry
 */
async function handleLicenseKeyEntry(tuish: Tuish): Promise<boolean> {
	const { licenseKey } = await prompts({
		type: 'text',
		name: 'licenseKey',
		message: 'Enter your license key:',
		validate: (value) => (value.length > 0 ? true : 'License key is required'),
	});

	if (!licenseKey) {
		return false;
	}

	const spinner = ora('Verifying license...').start();

	try {
		// Store the license
		tuish.storeLicense(licenseKey);

		// Verify it
		const result = await tuish.checkLicense();

		if (result.valid) {
			spinner.succeed('License verified successfully!');
			return true;
		} else {
			spinner.fail(`License invalid: ${result.reason ?? 'unknown error'}`);
			tuish.clearLicense();
			return false;
		}
	} catch (error) {
		spinner.fail('Failed to verify license');
		console.error(chalk.red(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
		return false;
	}
}

/**
 * Handle browser-based purchase
 */
async function handleBrowserPurchase(tuish: Tuish): Promise<boolean> {
	const spinner = ora('Creating checkout session...').start();

	try {
		const session = await tuish.purchaseInBrowser();
		spinner.succeed('Opening browser for checkout...');

		console.log();
		console.log(chalk.gray('  If the browser did not open, visit:'));
		console.log(chalk.cyan(`  ${session.checkoutUrl}`));
		console.log();

		const waitSpinner = ora('Waiting for payment...').start();

		const result = await tuish.waitForCheckoutComplete(session.sessionId, {
			pollIntervalMs: 2000,
			timeoutMs: 10 * 60 * 1000, // 10 minutes
			onPoll: (status) => {
				if (status === 'pending') {
					waitSpinner.text = 'Waiting for payment...';
				}
			},
		});

		if (result.valid) {
			waitSpinner.succeed('Payment successful! License activated.');
			return true;
		} else {
			waitSpinner.fail(`Payment not completed: ${result.reason ?? 'timeout'}`);
			return false;
		}
	} catch (error) {
		spinner.fail('Failed to create checkout session');
		console.error(chalk.red(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
		return false;
	}
}

/**
 * Handle terminal-based purchase (returning customers)
 */
async function handleTerminalPurchase(tuish: Tuish): Promise<boolean> {
	const { email } = await prompts({
		type: 'text',
		name: 'email',
		message: 'Enter your email:',
		validate: (value) =>
			/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'Please enter a valid email',
	});

	if (!email) {
		return false;
	}

	try {
		const result = await tuish.purchaseInTerminal({
			email,
			getLoginOtp: async (phoneMasked: string) => {
				console.log(chalk.gray(`  OTP sent to ${phoneMasked}`));
				const { otp } = await prompts({
					type: 'text',
					name: 'otp',
					message: 'Enter the 6-digit code:',
					validate: (value) => (/^\d{6}$/.test(value) ? true : 'Enter a 6-digit code'),
				});
				return otp;
			},
			selectCard: async (cards: SavedCard[], amount: number, currency: string) => {
				console.log();
				console.log(chalk.bold(`  Total: ${formatCurrency(amount, currency)}`));
				console.log();

				const { cardId } = await prompts({
					type: 'select',
					name: 'cardId',
					message: 'Select payment card:',
					choices: cards.map((card) => ({
						title: `${card.brand.toUpperCase()} ending in ${card.last4} (exp ${card.expiryMonth}/${card.expiryYear})`,
						value: card.id,
					})),
				});
				return cardId;
			},
			getPurchaseOtp: async (phoneMasked: string) => {
				console.log(chalk.gray(`  Confirmation code sent to ${phoneMasked}`));
				const { otp } = await prompts({
					type: 'text',
					name: 'otp',
					message: 'Enter confirmation code:',
					validate: (value) => (/^\d{6}$/.test(value) ? true : 'Enter a 6-digit code'),
				});
				return otp;
			},
		});

		if (result.success) {
			console.log(chalk.green('  ✓ Purchase successful!'));
			if (result.receiptUrl) {
				console.log(chalk.gray(`    Receipt: ${result.receiptUrl}`));
			}
			return true;
		} else if (result.requiresAction) {
			console.log(chalk.yellow('  Card requires additional authentication.'));
			console.log(chalk.gray(`  Please complete authentication at: ${result.actionUrl}`));
			return false;
		} else {
			console.log(chalk.red(`  Purchase failed: ${result.error ?? 'Unknown error'}`));
			return false;
		}
	} catch (error) {
		console.error(chalk.red(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
		return false;
	}
}

/**
 * Format currency amount
 */
function formatCurrency(cents: number, currency: string): string {
	const amount = cents / 100;
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase(),
	}).format(amount);
}

/**
 * Run a single pomodoro timer
 */
async function runTimer(
	label: string,
	durationMinutes: number,
	color: 'red' | 'green' | 'blue'
): Promise<boolean> {
	let totalSeconds = durationMinutes * 60;

	console.log();
	console.log(chalk.bold[color](`  Starting ${label} (${durationMinutes} minutes)`));
	console.log();

	return new Promise((resolve) => {
		const interval = setInterval(() => {
			process.stdout.write(`\r  ${chalk[color](formatTime(totalSeconds))} remaining...  `);

			totalSeconds--;

			if (totalSeconds < 0) {
				clearInterval(interval);
				process.stdout.write('\r');
				console.log(chalk.bold[color](`  ${label} complete!                    `));
				console.log('\x07'); // Bell character for notification

				resolve(true);
			}
		}, 1000);

		// Allow Ctrl+C to cancel
		process.on('SIGINT', () => {
			clearInterval(interval);
			console.log();
			console.log(chalk.yellow('  Timer cancelled'));
			resolve(false);
		});
	});
}

/**
 * Run the main pomodoro loop
 */
async function runPomodoro(): Promise<void> {
	let sessionCount = 0;

	while (true) {
		// Work session
		const workCompleted = await runTimer('Work Session', WORK_MINUTES, 'red');
		if (!workCompleted) break;

		sessionCount++;

		// Determine break type
		const isLongBreak = sessionCount % SESSIONS_BEFORE_LONG_BREAK === 0;
		const breakMinutes = isLongBreak ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES;
		const breakLabel = isLongBreak ? 'Long Break' : 'Short Break';

		console.log();
		console.log(chalk.gray(`  Completed ${sessionCount} pomodoro${sessionCount > 1 ? 's' : ''}`));

		const { takeBreak } = await prompts({
			type: 'confirm',
			name: 'takeBreak',
			message: `Take a ${breakMinutes}-minute ${breakLabel.toLowerCase()}?`,
			initial: true,
		});

		if (takeBreak) {
			const breakCompleted = await runTimer(breakLabel, breakMinutes, 'green');
			if (!breakCompleted) break;
		}

		const { continueWork } = await prompts({
			type: 'confirm',
			name: 'continueWork',
			message: 'Start another work session?',
			initial: true,
		});

		if (!continueWork) {
			break;
		}
	}

	console.log();
	console.log(chalk.cyan(`  Great work! You completed ${sessionCount} pomodoro session${sessionCount !== 1 ? 's' : ''} today.`));
	console.log();
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
	showHeader();

	const tuish = createTuishClient();

	// Check license
	const spinner = ora('Checking license...').start();
	const licenseResult = await tuish.checkLicense();
	spinner.stop();

	showLicenseStatus(licenseResult);

	// If no valid license, handle purchase
	if (!licenseResult.valid) {
		const purchased = await handlePurchase(tuish);
		if (!purchased) {
			console.log(chalk.gray('  Goodbye!'));
			process.exit(0);
		}

		// Re-check license after purchase
		const newResult = await tuish.checkLicense();
		if (!newResult.valid) {
			console.log(chalk.red('  License activation failed. Please try again.'));
			process.exit(1);
		}
	}

	// License is valid, run the app
	console.log(chalk.bold('  Ready to focus!'));
	console.log(chalk.gray(`  Work: ${WORK_MINUTES}min | Short break: ${SHORT_BREAK_MINUTES}min | Long break: ${LONG_BREAK_MINUTES}min`));
	console.log();

	const { start } = await prompts({
		type: 'confirm',
		name: 'start',
		message: 'Start your first pomodoro?',
		initial: true,
	});

	if (start) {
		await runPomodoro();
	}

	console.log(chalk.gray('  Goodbye!'));
}

// Run the app
main().catch((error) => {
	console.error(chalk.red('Fatal error:'), error);
	process.exit(1);
});
