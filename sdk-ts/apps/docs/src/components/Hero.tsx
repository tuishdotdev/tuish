'use client';


export function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-brand">
          <div className="hero-badge">
            <span className="badge">$_</span>
          </div>
          <h1 className="hero-title">tuish</h1>
        </div>
        <p className="hero-tagline">
          monetize your tui apps
        </p>
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
          gap: 1rem;
        }
        .hero-brand {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-left: -2.5rem;
        }
        .hero-badge {
          transform: scale(3) translateY(0.15rem);
          margin-left: 2rem;
          margin-right: 2rem;
        }
        .badge {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 1;
          padding: 0.2em 0.3em 0.3em 0.3em;
          font-size: 1.1rem;
          background: #50fa7b;
          color: #0a0a0f;
          border-radius: 0;
          font-weight: bold;
          font-family: Unifont, monospace;
        }
        .hero-title {
          font-size: 4rem;
          font-weight: bold;
          margin: 0;
          color: #50fa7b;
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
            font-size: 5rem;
          }
        }
      `}</style>
    </section>
  );
}
