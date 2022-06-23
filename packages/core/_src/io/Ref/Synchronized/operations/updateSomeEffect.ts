/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it doesn't
 * change it.
 *
 * @tsplus fluent ets/Ref/Synchronized updateSomeEffect
 */
export function updateSomeEffect_<R, E, A>(
  self: Ref.Synchronized<A>,
  pf: (a: A) => Maybe<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return self.modifyEffect((v) =>
    pf(v)
      .getOrElse<Effect<R, E, A>, Effect<R, E, A>>(Effect.succeedNow(v))
      .map((result) => Tuple(undefined, result))
  )
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it doesn't
 * change it.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects updateSomeEffect
 */
export const updateSomeEffect = Pipeable(updateSomeEffect_)
