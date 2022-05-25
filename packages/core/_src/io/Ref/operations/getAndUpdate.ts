/**
 * Atomically modifies the `Ref` with the specified function, returning the
 * value immediately before modification.
 *
 * @tsplus fluent ets/Ref getAndUpdate
 */
export function getAndUpdate_<A>(
  self: Ref<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect.UIO<A> {
  return self.modify((v) => Tuple(v, f(v)))
}

/**
 * Atomically modifies the `Ref` with the specified function, returning the
 * value immediately before modification.
 *
 * @tsplus static ets/Ref/Aspects getAndUpdate
 */
export const getAndUpdate = Pipeable(getAndUpdate_)
