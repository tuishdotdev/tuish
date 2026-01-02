'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserContext } from '@tuish/adapters-browser';
import type { PlatformContext } from '@tuish/cli-core';
import { executeCommand } from './CommandExecutor';

const getWelcomeLines = () => {
  const docsUrl = typeof window !== 'undefined' ? `${window.location.origin}/docs` : '/docs';
  return [
    '',
    'install locally: \x1b[1;32mnpm install -g tuish\x1b[0m',
    '',
    '\x1b[1;32m> tuish docs\x1b[0m      open documentation',
    '\x1b[1;32m> tuish help\x1b[0m      show available commands',
    '',
    `\x1b[90m→\x1b[0m \x1b[4;36m${docsUrl}\x1b[0m`,
    '',
  ];
};

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    let term: import('@xterm/xterm').Terminal | null = null;
    let cleanup: (() => void) | null = null;

    async function initTerminal() {
      if (!containerRef.current) return;

      // Dynamically import xterm modules (CommonJS)
      const [xtermModule, fitModule, linksModule] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links'),
      ]);

      // Import the CSS
      await import('@xterm/xterm/css/xterm.css');

      const XTerm = xtermModule.Terminal;
      const FitAddon = fitModule.FitAddon;
      const WebLinksAddon = linksModule.WebLinksAddon;

      term = new XTerm({
        theme: {
          background: 'transparent',
          foreground: '#e8e8e8',
          cursor: '#50fa7b',
          cursorAccent: '#000000',
          selectionBackground: 'rgba(80, 250, 123, 0.25)',
          black: '#1a1a1a',
          red: '#ff6b6b',
          green: '#50fa7b',
          yellow: '#50fa7b',
          blue: '#8be9fd',
          magenta: '#ff79c6',
          cyan: '#8be9fd',
          white: '#f0f0f0',
          brightBlack: '#555555',
          brightRed: '#ff8585',
          brightGreen: '#69ff94',
          brightYellow: '#69ff94',
          brightBlue: '#a4ffff',
          brightMagenta: '#ff92df',
          brightCyan: '#a4ffff',
          brightWhite: '#ffffff',
        },
        fontFamily: 'Unifont, monospace',
        fontSize: 14,
        lineHeight: 1.3,
        cursorBlink: true,
        cursorStyle: 'underline',
        allowTransparency: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      term.open(containerRef.current);
      fitAddon.fit();

      // Create browser-specific platform context
      const ctx = createBrowserContext({
        output: {
          write: (text) => term?.write(text),
          writeLine: (text) => term?.writeln(text),
          clear: () => term?.clear(),
        },
      });

      // Display welcome message
      for (const line of getWelcomeLines()) {
        term.writeln(line);
      }
      term.write('\x1b[1;32m$\x1b[0m ');

      // Auto-focus the terminal
      term.focus();

      // Handle resize
      const handleResize = () => {
        try {
          fitAddon.fit();
        } catch {
          // Ignore resize errors
        }
      };
      window.addEventListener('resize', handleResize);

      // Handle input
      let currentLine = '';
      let isProcessing = false;

      term.onKey(async ({ key, domEvent }) => {
        if (isProcessing || !term) return;

        if (domEvent.key === 'Enter') {
          term.writeln('');
          if (currentLine.trim()) {
            isProcessing = true;
            await executeCommand(ctx, currentLine.trim(), term);
            isProcessing = false;
          }
          term.write('\x1b[1;32m$\x1b[0m ');
          currentLine = '';
        } else if (domEvent.key === 'Backspace') {
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            term.write('\b \b');
          }
        } else if (domEvent.key === 'c' && domEvent.ctrlKey) {
          // Handle Ctrl+C
          term.writeln('^C');
          currentLine = '';
          term.write('\x1b[1;32m$\x1b[0m ');
        } else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
          currentLine += key;
          term.write(key);
        }
      });

      setIsLoading(false);

      cleanup = () => {
        window.removeEventListener('resize', handleResize);
        term?.dispose();
      };
    }

    initTerminal();

    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="terminal-container"
      style={{
        width: '100%',
        height: '500px',
        background: 'rgba(10, 10, 15, 0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 0,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: `
          0 0 0 1px rgba(255, 255, 255, 0.05) inset,
          0 8px 32px rgba(0, 0, 0, 0.3),
          0 0 80px rgba(80, 250, 123, 0.03)
        `,
        padding: '16px',
        overflow: 'hidden',
      }}
    >
      {isLoading && (
        <div style={{ padding: '20px', color: '#50fa7b' }}>
          Loading terminal...
        </div>
      )}
    </div>
  );
}
