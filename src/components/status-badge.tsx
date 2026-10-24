export function StatusBadge({status}: {status:string}) {
  return <span className={`badge status-${status.toLowerCase()}`}>{status.replaceAll("_", " ")}</span>;
}
