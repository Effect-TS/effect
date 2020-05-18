export function fold<A, B>(
  onFalse: () => A,
  onTrue: () => B
): (value: boolean) => A | B {
  return (value) => (value ? onTrue() : onFalse())
}
