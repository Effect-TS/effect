// Transformations and checks whose decoding is deterministic and free of side
// effects. Compiled `decode` operations may run them and still return `invalid`,
// because replaying them in the detailed decoder is unobservable.
const replaySafe = new WeakSet<object>()

/** @internal */
export const markReplaySafe = <A extends object>(value: A): A => {
  replaySafe.add(value)
  return value
}

/** @internal */
export const isReplaySafe = (value: object): boolean => replaySafe.has(value)
