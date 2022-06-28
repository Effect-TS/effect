/**
 * Atomically modifies the `FiberRef` with the specified function.
 *
 * @tsplus fluent effect/core/io/FiberRef update
 */
export function update_<A, P>(
  self: FiberRef<A, P>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect<never, never, void> {
  return self.modify((v) => Tuple(undefined, f(v)))
}

/**
 * Atomically modifies the `FiberRef` with the specified function.
 *
 * @tsplus static effect/core/io/FiberRef.Aspects update
 */
export const update = Pipeable(update_)
