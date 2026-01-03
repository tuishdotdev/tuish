'use client';

import Link from 'next/link';
import { Badge, Heading } from 'tuimorphic';

export function Hero() {
	return (
		<section className="hero">
			<div className="hero-content">
				<div className="hero-brand">
					<div className="hero-badge">
						<Badge variant="success">$_</Badge>
					</div>
					<Heading
						level={1}
						decorated
						decorationStyle="double"
						className="hero-title"
					>
						tuish
					</Heading>
				</div>
				<p className="hero-tagline">monetize your tui apps</p>
				<div className="hero-actions">
					<Link href="/docs" className="hero-button hero-button-primary">
						Get Started
					</Link>
					<a
						href="https://github.com/tuishdotdev/tuish"
						target="_blank"
						rel="noopener noreferrer"
						className="hero-button hero-button-secondary"
					>
						GitHub
					</a>
				</div>
			</div>

			<style>{`
        .hero {
          text-align: center;
          padding: 3rem 0;
        }
        .hero-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }
        .hero-brand {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .hero-badge {
          transform: scale(2);
        }
        .hero-title {
          font-size: 4rem !important;
          margin: 0 !important;
          color: #50fa7b !important;
        }
        .hero-tagline {
          font-size: 1.5rem;
          color: rgba(255, 255, 255, 0.85);
          max-width: 500px;
          margin: 0;
          font-weight: 500;
          font-family: Unifont, monospace;
        }
        .hero-actions {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .hero-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          font-family: Unifont, monospace;
          font-size: 0.875rem;
          text-decoration: none;
          border: 2px solid;
          transition: all 0.2s ease;
        }
        .hero-button-primary {
          background: #50fa7b;
          color: #0a0a0f;
          border-color: #50fa7b;
        }
        .hero-button-primary:hover {
          background: #3dd866;
          border-color: #3dd866;
        }
        .hero-button-secondary {
          background: transparent;
          color: #50fa7b;
          border-color: #50fa7b;
        }
        .hero-button-secondary:hover {
          background: rgba(80, 250, 123, 0.1);
        }
        @media (min-width: 768px) {
          .hero-title {
            font-size: 5rem !important;
          }
        }
      `}</style>
		</section>
	);
}
