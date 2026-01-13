'use client';

import { Badge } from 'tuimorphic';

export function Hero() {
	return (
		<section className="hero">
			<div className="hero-content">
				<div className="hero-brand">
					<div className="hero-badge">
						<Badge variant="success">$_</Badge>
					</div>
					<h1 className="hero-title">tuish</h1>
				</div>
				<p className="hero-tagline">monetize your vibes</p>
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
        @media (min-width: 768px) {
          .hero-title {
            font-size: 5rem !important;
          }
        }
      `}</style>
		</section>
	);
}
