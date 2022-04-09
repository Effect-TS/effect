/**
 * Applies `f` if the predicate fails.
 *
 * @tsplus fluent ets/Effect filterOrElse
 */
export function filterOrElse_<R, E, A, B extends A, R1, E1, A1>(
  self: Effect<R, E, A>,
  f: Refinement<A, B>,
  effect: LazyArg<Effect<R1, E1, A1>>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, B | A1>;
export function filterOrElse_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  filter: Predicate<A>,
  effect: LazyArg<Effect<R1, E1, A1>>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, A | A1>;
export function filterOrElse_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  effect: LazyArg<Effect<R1, E1, A1>>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, A | A1> {
  return self.filterOrElseWith(f, effect);
}

/**
 * Applies `f` if the predicate fails.
 *
 * @tsplus static ets/Effect/Aspects filterOrElse
 */
export function filterOrElse<A, B extends A, R1, E1, A1>(
  f: Refinement<A, B>,
  effect: LazyArg<Effect<R1, E1, A1>>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R & R1, E | E1, B | A1>;
export function filterOrElse<A, R1, E1, A1>(
  f: Predicate<A>,
  effect: LazyArg<Effect<R1, E1, A1>>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R & R1, E | E1, A | A1>;
export function filterOrElse<A, R1, E1, A1>(
  f: Predicate<A>,
  effect: LazyArg<Effect<R1, E1, A1>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A | A1> => self.filterOrElse(f, effect);
}
