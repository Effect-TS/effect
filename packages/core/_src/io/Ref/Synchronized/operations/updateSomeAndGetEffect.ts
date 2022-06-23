/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns
 * the old value without changing it.
 *
 * @tsplus fluent ets/Ref/Synchronized updateSomeAndGetEffect
 */
export function updateSomeAndGetEffect_<R, E, A>(
  self: Ref.Synchronized<A>,
  pf: (a: A) => Maybe<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.modifyEffect((v) =>
    pf(v)
      .getOrElse<Effect<R, E, A>, Effect<R, E, A>>(Effect.succeedNow(v))
      .map((result) => Tuple(result, result))
  )
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns
 * the old value without changing it.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects updateSomeAndGetEffect
 */
export const updateSomeAndGetEffect = Pipeable(updateSomeAndGetEffect_)
