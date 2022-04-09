/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @tsplus fluent ets/STM filterOrDieWith
 */
export function filterOrDieWith_<R, E, A, B extends A>(
  self: STM<R, E, A>,
  f: Refinement<A, B>,
  dieWith: (a: Exclude<A, B>) => unknown
): STM<R, E, B>;
export function filterOrDieWith_<R, E, A>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  dieWith: (a: A) => unknown
): STM<R, E, A>;
export function filterOrDieWith_<R, E, A>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  dieWith: unknown
) {
  return self.filterOrElseWith(f, (x) => STM.die((dieWith as (a: A) => unknown)(x)));
}

/**
 * Dies with specified `unknown` if the predicate fails.
 *
 * @tsplus static ets/STM/Aspects filterOrDieWith
 */
export function filterOrDieWith<A, B extends A>(
  f: Refinement<A, B>,
  dieWith: (a: Exclude<A, B>) => unknown
): <R, E>(self: STM<R, E, A>) => STM<R, E, B>;
export function filterOrDieWith<A>(
  f: Predicate<A>,
  dieWith: (a: A) => unknown
): <R, E>(self: STM<R, E, A>) => STM<R, E, A>;
export function filterOrDieWith<A>(f: Predicate<A>, dieWith: unknown) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, A> => self.filterOrDieWith(f, dieWith as (a: A) => unknown);
}
