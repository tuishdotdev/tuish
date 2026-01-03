'use client';

import 'tuimorphic/styles.css';

import { MatrixRain } from '@/components/MatrixRain';
import { BloomOverlay } from '@/components/BloomOverlay';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import { Terminal } from '@/components/terminal/Terminal';

export default function HomePage() {
	return (
		<div className="landing-page">
			<MatrixRain />
			<BloomOverlay />
			<main className="main-container">
				<Hero />
				<div className="terminal-wrapper">
					<Terminal />
				</div>
				<Features />
			</main>
			<Footer />

			<style>{`
        .landing-page {
          min-height: 100vh;
          background: #0a0a0f;
          display: flex;
          flex-direction: column;
          font-family: Unifont, monospace;
        }
        .main-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 10;
          padding: 2rem;
          max-width: 1000px;
          width: 100%;
          margin: 0 auto;
          flex: 1;
          gap: 1rem;
        }
        .terminal-wrapper {
          width: 100%;
        }

        /* Force xterm transparency - no :global() in inline styles */
        .xterm,
        .xterm-viewport,
        .xterm-screen {
          background: transparent !important;
          background-color: transparent !important;
        }
        .xterm {
          padding: 8px 12px 16px 12px;
        }
        .xterm-viewport {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .xterm-viewport::-webkit-scrollbar {
          display: none;
        }
      `}</style>
		</div>
	);
}
