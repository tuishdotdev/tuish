'use client';

import { Card } from 'tuimorphic';

const features = [
	{
		title: 'ONE-TIME LICENSE',
		subtitle: 'perpetual',
		description:
			'Users purchase once in their browser. The license lives on their machine forever.',
	},
	{
		title: 'OFFLINE FIRST',
		subtitle: 'no network',
		description:
			'Cryptographic license validation. No network calls needed after purchase.',
	},
	{
		title: 'DEVELOPER FRIENDLY',
		subtitle: 'simple SDK',
		description:
			'Simple SDK integration. Works with any TUI framework or language.',
	},
];

export function Features() {
	return (
		<section className="features">
			<div className="features-grid">
				{features.map((feature) => (
					<Card key={feature.title} title={feature.title} mode="left">
						<div className="feature-content">
							<span className="feature-subtitle">{feature.subtitle}</span>
							<p className="feature-description">{feature.description}</p>
						</div>
					</Card>
				))}
			</div>

			<style>{`
        .features {
          padding: 2rem 0;
          width: 100%;
        }
        .features-grid {
          display: grid;
          gap: 1.5rem;
        }
        @media (min-width: 768px) {
          .features-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .feature-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .feature-subtitle {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.6;
        }
        .feature-description {
          font-size: 0.875rem;
          margin: 0;
          line-height: 1.5;
          opacity: 0.8;
        }
      `}</style>
		</section>
	);
}
