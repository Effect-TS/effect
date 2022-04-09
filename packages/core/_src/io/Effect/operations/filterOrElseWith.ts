/**
 * Applies `f` if the predicate fails.
 *
 * @tsplus fluent ets/Effect filterOrElseWith
 */
export function filterOrElseWith_<R, E, A, B extends A, R1, E1, A1>(
  self: Effect<R, E, A>,
  f: Refinement<A, B>,
  orElse: (a: A) => Effect<R1, E1, A1>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, B | A1>;
export function filterOrElseWith_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  orElse: (a: A) => Effect<R1, E1, A1>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, A | A1>;
export function filterOrElseWith_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  orElse: (a: A) => Effect<R1, E1, A1>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, A | A1> {
  return self.flatMap((a) => (f(a) ? Effect.succeedNow<A | A1>(a) : orElse(a)));
}

/**
 * Applies `f` if the predicate fails.
 *
 * @tsplus static ets/Effect/Aspects filterOrElseWith
 */
export function filterOrElseWith<A, B extends A, R1, E1, A1>(
  f: Refinement<A, B>,
  orElse: (a: A) => Effect<R1, E1, A1>,
  __tsplusTrace?: string | undefined
): <R, E>(self: Effect<R, E, A>) => Effect<R & R1, E | E1, B | A1>;
export function filterOrElseWith<A, R1, E1, A1>(
  f: Predicate<A>,
  orElse: (a: A) => Effect<R1, E1, A1>,
  __tsplusTrace?: string | undefined
): <R, E>(self: Effect<R, E, A>) => Effect<R & R1, E | E1, A | A1>;
export function filterOrElseWith<A, R1, E1, A1>(
  f: Predicate<A>,
  orElse: (a: A) => Effect<R1, E1, A1>,
  __tsplusTrace?: string | undefined
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A | A1> => self.filterOrElseWith(f, orElse);
}
