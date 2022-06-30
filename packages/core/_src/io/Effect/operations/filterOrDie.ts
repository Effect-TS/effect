/**
 * Dies with specified defect if the predicate fails.
 *
 * @tsplus static effect/core/io/Effect.Aspects filterOrDie
 * @tsplus pipeable effect/core/io/Effect filterOrDie
 */
export function filterOrDie<A, B extends A>(
  f: Refinement<A, B>,
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDie<A>(
  f: Predicate<A>,
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDie<A>(
  f: Predicate<A>,
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> => Effect.$.filterOrElse(f, Effect.die(defect))(self)
}
