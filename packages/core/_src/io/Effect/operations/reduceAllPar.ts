/**
 * Reduces an `Collection<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * in parallel.
 *
 * @tsplus static ets/Effect/Ops reduceAllPar
 */
export function reduceAllPar<R, E, A>(
  a: LazyArg<Effect<R, E, A>>,
  as: LazyArg<Collection<Effect<R, E, A>>>,
  f: (acc: A, a: A) => A,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(
    Effect.mergeAllPar<R, E, A, Option<A>>(
      Collection.of(a()).concat(as()),
      Option.none,
      (acc, elem) =>
        Option.some(
          acc.fold(
            () => elem,
            (a) => f(a, elem)
          )
        )
    ).map((option) =>
      option.getOrElse(() => {
        throw new Error("Bug")
      })
    )
  )
}
