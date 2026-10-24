export default function Loading() {
  return (
    <main className="system-state" aria-live="polite" aria-busy="true">
      <p>Loading evidence workspace…</p>
      <div aria-hidden="true">
        <div className="skeleton" />
        <div className="skeleton large" />
        <div className="skeleton" />
      </div>
    </main>
  );
}
