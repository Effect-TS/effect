/**
 * Returns an infinite stream of iterative function application: `a`, `f(a)`,
 * `f(f(a))`, `f(f(f(a)))`, ...
 *
 * @tsplus static ets/Stream/Ops iterate
 */
export function iterate<A>(
  a: LazyArg<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Stream<never, never, A> {
  return Stream.unfold(a, (a) => Maybe.some(Tuple(a, f(a))))
}
