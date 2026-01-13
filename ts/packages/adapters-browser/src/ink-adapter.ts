type EventListener = (...args: unknown[]) => void;

/**
 * Minimal browser-compatible EventEmitter
 */
class BrowserEventEmitter {
	private listeners: Map<string, EventListener[]> = new Map();

	on(event: string, listener: EventListener): this {
		const list = this.listeners.get(event) ?? [];
		list.push(listener);
		this.listeners.set(event, list);
		return this;
	}

	// Alias for on (Node.js EventEmitter compatibility)
	addListener(event: string, listener: EventListener): this {
		return this.on(event, listener);
	}

	off(event: string, listener: EventListener): this {
		const list = this.listeners.get(event);
		if (list) {
			const index = list.indexOf(listener);
			if (index !== -1) list.splice(index, 1);
		}
		return this;
	}

	// Alias for off (Node.js EventEmitter compatibility)
	removeListener(event: string, listener: EventListener): this {
		return this.off(event, listener);
	}

	emit(event: string, ...args: unknown[]): boolean {
		const list = this.listeners.get(event);
		if (!list) return false;
		for (const listener of list) listener(...args);
		return true;
	}

	removeAllListeners(event?: string): this {
		if (event) {
			this.listeners.delete(event);
		} else {
			this.listeners.clear();
		}
		return this;
	}
}

/**
 * Mock TTY WriteStream for xterm.js
 * Bridges Ink's output to xterm.js terminal
 */
export class XtermWriteStream extends BrowserEventEmitter {
	isTTY = true;
	columns = 80;
	rows = 24;

	private writeCallback: (data: string) => void;

	constructor(writeCallback: (data: string) => void, columns = 80, rows = 24) {
		super();
		this.writeCallback = writeCallback;
		this.columns = columns;
		this.rows = rows;
	}

	write(data: string | Uint8Array): boolean {
		const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
		this.writeCallback(str);
		return true;
	}

	// Required by Ink
	clearLine(_dir: number): boolean {
		this.writeCallback('\x1b[2K');
		return true;
	}

	cursorTo(x: number, _y?: number): boolean {
		this.writeCallback(`\x1b[${x + 1}G`);
		return true;
	}

	moveCursor(dx: number, dy: number): boolean {
		if (dx > 0) this.writeCallback(`\x1b[${dx}C`);
		if (dx < 0) this.writeCallback(`\x1b[${-dx}D`);
		if (dy > 0) this.writeCallback(`\x1b[${dy}B`);
		if (dy < 0) this.writeCallback(`\x1b[${-dy}A`);
		return true;
	}

	// Update dimensions when terminal resizes
	setDimensions(columns: number, rows: number): void {
		this.columns = columns;
		this.rows = rows;
		this.emit('resize');
	}

	// No-op methods required by stream interface
	end(): void {}
	cork(): void {}
	uncork(): void {}
	destroy(): void {}
	getColorDepth(): number {
		return 24;
	}
	hasColors(): boolean {
		return true;
	}
}

/**
 * Mock TTY ReadStream for xterm.js
 * Bridges xterm.js keyboard input to Ink
 *
 * Ink uses the Node.js readable stream pattern:
 * 1. Listens for 'readable' events
 * 2. Calls read() to get buffered data
 */
export class XtermReadStream extends BrowserEventEmitter {
	isTTY = true;
	isRaw = false;
	private paused = false;
	private buffer: string[] = [];

	constructor() {
		super();
	}

	setRawMode(mode: boolean): this {
		this.isRaw = mode;
		return this;
	}

	// Call this when xterm.js receives keyboard input
	pushKey(key: string): void {
		if (!this.paused) {
			// Buffer the input
			this.buffer.push(key);
			// Emit 'readable' to signal data is available (Ink listens for this)
			this.emit('readable');
			// Also emit 'data' for compatibility with other consumers
			this.emit('data', key);
		}
	}

	pause(): this {
		this.paused = true;
		return this;
	}

	resume(): this {
		this.paused = false;
		return this;
	}

	// Ink calls read() to get buffered input after 'readable' event
	read(): string | null {
		if (this.buffer.length === 0) {
			return null;
		}
		// Return all buffered input as a single string
		const data = this.buffer.join('');
		this.buffer = [];
		return data;
	}

	setEncoding(_encoding: string): this {
		return this;
	}

	unref(): this {
		return this;
	}

	ref(): this {
		return this;
	}
}

export interface XtermInkBridge {
	stdout: XtermWriteStream;
	stderr: XtermWriteStream;
	stdin: XtermReadStream;
	pushKey: (key: string) => void;
	setDimensions: (columns: number, rows: number) => void;
}

/**
 * Create a bridge between xterm.js and Ink
 */
export function createXtermInkBridge(
	writeCallback: (data: string) => void,
	columns = 80,
	rows = 24,
): XtermInkBridge {
	const stdout = new XtermWriteStream(writeCallback, columns, rows);
	const stderr = new XtermWriteStream(writeCallback, columns, rows);
	const stdin = new XtermReadStream();

	return {
		stdout,
		stderr,
		stdin,
		pushKey: (key: string) => stdin.pushKey(key),
		setDimensions: (cols: number, rows: number) => {
			stdout.setDimensions(cols, rows);
			stderr.setDimensions(cols, rows);
		},
	};
}
