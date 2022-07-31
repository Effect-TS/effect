/**
 * Returns an infinite stream of iterative function application: `a`, `f(a)`,
 * `f(f(a))`, `f(f(f(a)))`, ...
 *
 * @tsplus static effect/core/stream/Stream.Ops iterate
 */
export function iterate<A>(
  a: LazyArg<A>,
  f: (a: A) => A
): Stream<never, never, A> {
  return Stream.unfold(a, (a) => Maybe.some(Tuple(a, f(a))))
}
