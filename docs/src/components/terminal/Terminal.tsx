'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserContext } from '@tuish/adapters-browser';
import type { PlatformContext } from '@tuish/cli-core';
import { executeCommand } from './CommandExecutor';

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

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
        fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? 12 : 18,
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

      // Handle input with command history
      let currentLine = '';
      let isProcessing = false;
      const commandHistory: string[] = [];
      let historyIndex = -1;
      let savedCurrentLine = '';

      // Animation helpers
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const typeText = async (text: string, delay: number = 30) => {
        for (const char of text) {
          term?.write(char);
          await sleep(delay);
        }
      };

      const animateCommand = async (text: string, delay: number = 40) => {
        term?.write('\x1b[1;32m$\x1b[0m ');
        for (const char of text) {
          term?.write(char);
          await sleep(delay);
        }
        await sleep(200);
        term?.writeln('');
        if (term) {
          await executeCommand(ctx, text, term);
        }
        commandHistory.push(text);
        historyIndex = commandHistory.length;
        term?.write('\x1b[1;32m$\x1b[0m ');
      };

      // Hide loading, then run intro animation
      setIsLoading(false);
      await sleep(100);

      // Clear and scroll to top
      term.write('\x1b[H\x1b[2J');
      term.scrollToTop();

      // Logo - green block with $_ and tuish text (bold)
      const logo = [
        '\x1b[1;30;42m $_ \x1b[0m  \x1b[1;32mtuish\x1b[0m',
      ];
      for (const line of logo) {
        term.writeln(line);
        await sleep(30);
      }
      await sleep(300);
      term.writeln('');

      // Animated intro - use \x1b[37m (white) for readable comments
      term.write('\x1b[37m');
      await typeText('# monetization for terminal apps', 20);
      term.writeln('\x1b[0m');
      await sleep(300);
      term.write('\x1b[37m');
      await typeText('# add licensing & payments to any CLI in minutes', 20);
      term.writeln('\x1b[0m');
      await sleep(300);
      term.writeln('');

      term.write('\x1b[37m');
      await typeText('# install:', 15);
      term.writeln('\x1b[0m');
      await sleep(100);
      term.write('  \x1b[1;32m');
      await typeText('npm i tuish', 15);
      term.writeln('\x1b[0m');
      await sleep(80);
      term.write('  \x1b[1;32m');
      await typeText('cargo add tuish', 15);
      term.writeln('\x1b[0m');
      await sleep(80);
      term.write('  \x1b[1;32m');
      await typeText('go get tuish', 15);
      term.writeln('\x1b[0m');
      await sleep(80);
      term.write('  \x1b[1;32m');
      await typeText('pip install tuish', 15);
      term.writeln('\x1b[0m');
      await sleep(400);
      term.writeln('');

      await animateCommand('tuish help', 40);

      term.onKey(async ({ key, domEvent }) => {
        if (isProcessing || !term) return;

        if (domEvent.key === 'Enter') {
          term.writeln('');
          if (currentLine.trim()) {
            commandHistory.push(currentLine.trim());
            historyIndex = commandHistory.length;
            isProcessing = true;
            await executeCommand(ctx, currentLine.trim(), term);
            isProcessing = false;
          }
          term.write('\x1b[1;32m$\x1b[0m ');
          currentLine = '';
          savedCurrentLine = '';
        } else if (domEvent.key === 'Backspace') {
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            term.write('\b \b');
          }
        } else if (domEvent.key === 'ArrowUp') {
          if (commandHistory.length > 0 && historyIndex > 0) {
            // Save current line if we're just starting to navigate
            if (historyIndex === commandHistory.length) {
              savedCurrentLine = currentLine;
            }
            historyIndex--;
            // Clear current line
            term.write('\r\x1b[K\x1b[1;32m$\x1b[0m ');
            currentLine = commandHistory[historyIndex] ?? '';
            term.write(currentLine);
          }
        } else if (domEvent.key === 'ArrowDown') {
          if (historyIndex < commandHistory.length) {
            historyIndex++;
            // Clear current line
            term.write('\r\x1b[K\x1b[1;32m$\x1b[0m ');
            if (historyIndex === commandHistory.length) {
              // Restore saved current line
              currentLine = savedCurrentLine;
            } else {
              currentLine = commandHistory[historyIndex] ?? '';
            }
            term.write(currentLine);
          }
        } else if (domEvent.key === 'c' && domEvent.ctrlKey) {
          // Handle Ctrl+C
          term.writeln('^C');
          currentLine = '';
          historyIndex = commandHistory.length;
          term.write('\x1b[1;32m$\x1b[0m ');
        } else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
          currentLine += key;
          term.write(key);
        }
      });

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
        height: '100%',
        flex: 1,
        minHeight: '500px',
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
