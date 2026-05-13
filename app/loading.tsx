export default function Loading() {
  return (
    <div style={{ minHeight: "40vh", display: "grid", placeItems: "center", padding: "80px 24px" }}>
      <div className="container narrow" style={{ textAlign: "center" }}>
        <div className="loader" aria-label="Laddar innehåll" role="status" />
        <p className="dim" style={{ marginTop: 16, fontSize: 13 }}>Laddar...</p>
      </div>
      <style>{`
        .loader {
          width: 32px;
          height: 32px;
          border: 2px solid var(--c-line);
          border-top-color: var(--c-gold);
          border-radius: 50%;
          margin: 0 auto;
          animation: spin 800ms linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .loader { animation-duration: 3s; }
        }
      `}</style>
    </div>
  );
}
