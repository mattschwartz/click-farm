/**
 * Filename used for the Export Save download (§5.1). Intentionally
 * encodes rebrand count + timestamp so multiple exports sort naturally
 * and are self-describing.
 */
export function formatExportFilename(
  rebrandCount: number,
  nowMs: number,
): string {
  // ISO without milliseconds or colons so the filename is filesystem-safe.
  const iso = new Date(nowMs).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `click-farm-save-${rebrandCount}-${iso}.json`;
}
