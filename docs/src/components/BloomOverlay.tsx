'use client';

export function BloomOverlay() {
  return (
    <>
      {/* Bloom layer - subtle glow */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 9998,
          pointerEvents: 'none',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          mixBlendMode: 'plus-lighter',
          opacity: 0.2,
        }}
      />

      {/* CRT Scanlines - visible lines */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 9999,
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.25) 0px, rgba(0, 0, 0, 0.25) 1px, transparent 1px, transparent 3px)',
          opacity: 1,
        }}
      />

      {/* Vignette - light edges */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10000,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 65%, rgba(0, 0, 0, 0.15) 100%)',
        }}
      />

      {/* CRT Flicker - barely visible */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10001,
          pointerEvents: 'none',
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.02) 50%)',
          backgroundSize: '100% 4px',
          opacity: 0.15,
        }}
      />
    </>
  );
}
