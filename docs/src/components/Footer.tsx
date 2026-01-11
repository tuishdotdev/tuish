'use client';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-text">&copy; {year} tuish. All rights reserved.</p>
        <div className="footer-links">
          <a href="/docs" className="footer-link">Docs</a>
          <span className="footer-separator">|</span>
          <a href="https://github.com/tuishdotdev/tuish" className="footer-link">GitHub</a>
          <span className="footer-separator">|</span>
          <a href="/docs/privacy" className="footer-link">Privacy</a>
        </div>
      </div>

      <style>{`
        .footer {
          padding: 2rem 0;
          margin-top: auto;
          position: relative;
          z-index: 10;
          font-family: Unifont, monospace;
        }
        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding-top: 1.5rem;
        }
        .footer-text {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.875rem;
          margin: 0;
        }
        .footer-links {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .footer-link {
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .footer-link:hover {
          color: #50fa7b;
        }
        .footer-separator {
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </footer>
  );
}
