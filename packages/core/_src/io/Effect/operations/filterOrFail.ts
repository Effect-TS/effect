/**
 * Fails with `e` if the predicate fails.
 *
 * @tsplus fluent ets/Effect filterOrFail
 */
export function filterOrFail_<R, E, E1, A, B extends A>(
  self: Effect<R, E, A>,
  f: Refinement<A, B>,
  error: LazyArg<E1>,
  __tsplusTrace?: string
): Effect<R, E | E1, B>;
export function filterOrFail_<R, E, E1, A>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  error: LazyArg<E1>,
  __tsplusTrace?: string
): Effect<R, E | E1, A>;
export function filterOrFail_<R, E, E1, A>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  error: LazyArg<E1>,
  __tsplusTrace?: string
): Effect<R, E | E1, A> {
  return self.filterOrElse(f, Effect.fail(error));
}

/**
 * Fails with `e` if the predicate fails.
 *
 * @tsplus static ets/Effect/Aspects filterOrFail
 */
export function filterOrFail<E1, A, B extends A>(
  f: Refinement<A, B>,
  error: LazyArg<E1>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R, E | E1, B>;
export function filterOrFail<E1, A>(
  f: Predicate<A>,
  error: LazyArg<E1>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R, E | E1, A>;
export function filterOrFail<E1, A>(
  f: Predicate<A>,
  error: LazyArg<E1>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E | E1, A> => self.filterOrFail(f, error);
}
