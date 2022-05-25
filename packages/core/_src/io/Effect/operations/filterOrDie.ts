/**
 * Dies with specified defect if the predicate fails.
 *
 * @tsplus fluent ets/Effect filterOrDie
 */
export function filterOrDie_<R, E, A, B extends A>(
  self: Effect<R, E, A>,
  f: Refinement<A, B>,
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
): Effect<R, E, A>
export function filterOrDie_<R, E, A>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
): Effect<R, E, A>
export function filterOrDie_<R, E, A>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.filterOrElse(f, Effect.die(defect))
}

/**
 * Dies with specified defect if the predicate fails.
 *
 * @tsplus static ets/Effect/Aspects filterOrDie
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
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> => self.filterOrDie(f, defect)
}
