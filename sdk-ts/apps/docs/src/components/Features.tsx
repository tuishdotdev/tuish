'use client';

const features = [
  {
    title: 'ONE-TIME LICENSE',
    subtitle: 'perpetual',
    description: 'Users purchase once in their browser. The license lives on their machine forever.',
  },
  {
    title: 'OFFLINE FIRST',
    subtitle: 'no network',
    description: 'Cryptographic license validation. No network calls needed after purchase.',
  },
  {
    title: 'DEVELOPER FRIENDLY',
    subtitle: 'simple SDK',
    description: 'Simple SDK integration. Works with any TUI framework or language.',
  },
];

export function Features() {
  return (
    <section className="features">
      <div className="features-grid">
        {features.map((feature) => (
          <div key={feature.title} className="feature-card">
            <div className="feature-title">{feature.title}</div>
            <div className="feature-content">
              <span className="feature-subtitle">{feature.subtitle}</span>
              <p className="feature-description">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .features {
          padding: 2rem 0;
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
        .feature-card {
          background: rgba(15, 15, 20, 0.35);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0;
          padding: 1.5rem;
          transition: transform 0.2s ease;
          font-family: Unifont, monospace;
        }
        .feature-card:hover {
          transform: translateY(-2px);
        }
        .feature-title {
          font-size: 0.875rem;
          font-weight: bold;
          color: #50fa7b;
          margin-bottom: 0.75rem;
          letter-spacing: 0.05em;
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
          opacity: 0.8;
          color: rgba(255, 255, 255, 0.6);
        }
        .feature-description {
          font-size: 0.875rem;
          margin: 0;
          line-height: 1.5;
          opacity: 0.9;
          color: rgba(255, 255, 255, 0.8);
        }
      `}</style>
    </section>
  );
}
