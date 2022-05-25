/**
 * Atomically modifies the `Ref.Synchronized` with the specified function,
 * returning the value immediately before modification.
 *
 * @tsplus fluent ets/Ref/Synchronized getAndUpdate
 */
export function getAndUpdate_<A>(
  self: SynchronizedRef<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect.UIO<A> {
  return self.modify(v => Tuple(v, f(v)))
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function,
 * returning the value immediately before modification.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects getAndUpdate
 */
export const getAndUpdate = Pipeable(getAndUpdate_)
