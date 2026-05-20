/**
 * Generate a short, URL-safe ID for survey entities (blocks, questions, choices, logic rules).
 * Not cryptographically strong — DB primary keys use UUIDs.
 */
export function shortId(prefix?: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36).slice(-4);
  const id = `${random}${time}`;
  return prefix ? `${prefix}_${id}` : id;
}
