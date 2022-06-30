/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the old value.
 *
 * @tsplus fluent effect/core/io/FiberRef getAndUpdate
 */
export function getAndUpdate_<A, P>(
  self: FiberRef<A, P>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect<never, never, A> {
  return self.modify((v) => Tuple(v, f(v)))
}

/**
 * Atomically modifies the `XFiberRef` with the specified function and
 * returns the old value.
 *
 * @tsplus static effect/core/io/FiberRef.Aspects getAndUpdate
 */
export const getAndUpdate = Pipeable(getAndUpdate_)
