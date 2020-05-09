export function not(a: boolean) {
  return !a
}
export function and(a: boolean, b: boolean) {
  return a && b
}
export function or(a: boolean, b: boolean) {
  return a || b
}
export function fold<A, B>(
  onFalse: () => A,
  onTrue: () => B
): (value: boolean) => A | B {
  return (value) => (value ? onTrue() : onFalse())
}
