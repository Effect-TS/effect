import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export function repeatWhileM<A, R1, E1>(f: (a: A) => Effect<R1, E1, boolean>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A> =>
    repeatWhileM_(self, f)
}

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export function repeatWhileM_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, E1, boolean>
): Effect<R & R1, E | E1, A> {
  return chain_(self, (a) =>
    chain_(f(a), (b) => (b ? repeatWhileM(f)(self) : succeed(a)))
  )
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export function repeatWhile<A>(f: (a: A) => boolean) {
  return <R, E>(self: Effect<R, E, A>) => repeatWhile_(self, f)
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export function repeatWhile_<R, E, A>(self: Effect<R, E, A>, f: (a: A) => boolean) {
  return repeatWhileM_(self, (a) => succeed(f(a)))
}
