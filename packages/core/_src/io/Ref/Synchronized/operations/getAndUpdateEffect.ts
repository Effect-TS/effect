/**
 * Atomically modifies the `Ref.Synchronized` with the specified function,
 * returning the value immediately before modification.
 *
 * @tsplus fluent ets/Ref/Synchronized getAndUpdateEffect
 */
export function getAndUpdateEffect_<R, E, A>(
  self: SynchronizedRef<A>,
  f: (a: A) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.modifyEffect((v) => f(v).map((result) => Tuple(v, result)))
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function,
 * returning the value immediately before modification.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects getAndUpdateEffect
 */
export const getAndUpdateEffect = Pipeable(getAndUpdateEffect_)
