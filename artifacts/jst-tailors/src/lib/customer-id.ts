/**
 * Formats a numeric customer database ID into a human-friendly
 * customer code like "JST-0042".
 *
 * The prefix is "JST" (JST Tailors) and the number is zero-padded to 4 digits.
 * e.g. id=1 → "JST-0001", id=42 → "JST-0042", id=1234 → "JST-1234"
 */
export function formatCustomerId(id: number): string {
  return `JST-${String(id).padStart(4, "0")}`;
}
