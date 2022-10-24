import * as Option from "@fp-ts/data/Option"

/**
 * Returns an infinite stream of iterative function application: `a`, `f(a)`,
 * `f(f(a))`, `f(f(f(a)))`, ...
 *
 * @tsplus static effect/core/stream/Stream.Ops iterate
 * @category mutations
 * @since 1.0.0
 */
export function iterate<A>(a: A, f: (a: A) => A): Stream<never, never, A> {
  return Stream.unfold(a, (a) => Option.some([a, f(a)]))
}
