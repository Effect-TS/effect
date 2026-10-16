// Library transformations and checks that can be replayed on primitive inputs
// without side effects or user code.
const replaySafe = new WeakSet<object>()

/** @internal */
export const markReplaySafe = <A extends object>(value: A): A => {
  replaySafe.add(value)
  return value
}

/** @internal */
export const isReplaySafe = (value: object): boolean => replaySafe.has(value)
