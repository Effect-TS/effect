export function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n
}
