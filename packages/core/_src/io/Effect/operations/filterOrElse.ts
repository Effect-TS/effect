/**
 * Applies `f` if the predicate fails.
 *
 * @tsplus static effect/core/io/Effect.Aspects filterOrElse
 * @tsplus pipeable effect/core/io/Effect filterOrElse
 */
export function filterOrElse<A, B extends A, R1, E1, A1>(
  f: Refinement<A, B>,
  effect: LazyArg<Effect<R1, E1, A1>>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R | R1, E | E1, B | A1>
export function filterOrElse<A, R1, E1, A1>(
  f: Predicate<A>,
  effect: LazyArg<Effect<R1, E1, A1>>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R | R1, E | E1, A | A1>
export function filterOrElse<A, R1, E1, A1>(
  f: Predicate<A>,
  effect: LazyArg<Effect<R1, E1, A1>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E | E1, A | A1> => Effect.$.filterOrElseWith(f, effect)(self)
}
