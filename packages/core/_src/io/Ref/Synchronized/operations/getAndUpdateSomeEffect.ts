/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function, returning the value immediately before modification. If the
 * function is undefined on the current value it doesn't change it.
 *
 * @tsplus fluent ets/Ref/Synchronized getAndUpdateSomeEffect
 */
export function getAndUpdateSomeEffect_<R, E, A>(
  self: Ref.Synchronized<A>,
  pf: (a: A) => Maybe<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.modifyEffect((v) =>
    pf(v)
      .getOrElse(Effect.succeedNow(v))
      .map((result) => Tuple(v, result))
  )
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function, returning the value immediately before modification. If the
 * function is undefined on the current value it doesn't change it.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects getAndUpdateSomeEffect
 */
export const getAndUpdateSomeEffect = Pipeable(getAndUpdateSomeEffect_)
