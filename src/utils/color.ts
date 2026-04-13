export function HexToColor(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}
