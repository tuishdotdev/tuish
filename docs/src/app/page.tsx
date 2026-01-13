'use client';

import 'tuimorphic/styles.css';

import dynamic from 'next/dynamic';
import { MatrixRain } from '@/components/MatrixRain';
import { BloomOverlay } from '@/components/BloomOverlay';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';

// Load Terminal dynamically without SSR to avoid React hydration issues with xterm.js
const Terminal = dynamic(() => import('@/components/terminal/Terminal').then(mod => mod.Terminal), {
	ssr: false,
	loading: () => (
		<div style={{ padding: '20px', color: '#50fa7b', minHeight: '500px' }}>
			Loading terminal...
		</div>
	),
});

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
				{/* <Features /> */}
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
          justify-content: flex-start;
          position: relative;
          z-index: 10;
          padding: 0.25rem;
          padding-top: 0;
          max-width: 1000px;
          width: 100%;
          height: 100%;
          margin: 0 auto;
          flex: 1;
          gap: 0.25rem;
        }
        @media (min-width: 768px) {
          .main-container {
            padding: 1rem;
            padding-top: 1rem;
            gap: 1rem;
          }
        }
        .terminal-wrapper {
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
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
