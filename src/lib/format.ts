// Philippine peso formatting
const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const phpCompact = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Full peso amount with two decimals: ₱1,234.56 */
export function php(n: number): string {
  return phpFormatter.format(n || 0);
}

/** Whole-peso amount, no decimals: ₱1,234 */
export function phpWhole(n: number): string {
  return phpCompact.format(n || 0);
}
