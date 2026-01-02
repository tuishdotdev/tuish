import type { OutputAdapter } from '@tuish/cli-core';

/**
 * Output callback type for browser terminal integration.
 * This allows the browser terminal (xterm.js) to receive output.
 */
export type OutputCallback = {
  write: (text: string) => void;
  writeLine: (text: string) => void;
  clear: () => void;
};

/**
 * Creates a browser output adapter that delegates to callbacks.
 * This is used with xterm.js or similar terminal emulators.
 */
export function createBrowserOutputAdapter(callbacks: OutputCallback): OutputAdapter {
  return {
    write: callbacks.write,
    writeLine: callbacks.writeLine,
    clear: callbacks.clear,
  };
}

/**
 * Creates a console-based output adapter for testing/debugging.
 */
export function createConsoleOutputAdapter(): OutputAdapter {
  return {
    write: (text: string) => {
      console.log(text);
    },
    writeLine: (text: string) => {
      console.log(text);
    },
    clear: () => {
      console.clear();
    },
  };
}
