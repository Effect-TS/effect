import { chain_, effectPartial } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapEffect<E>(onThrow: (u: unknown) => E) {
  return <A, B>(f: (a: A) => B) => <R, E1>(self: Effect<R, E1, A>) =>
    chain_(self, (a) => effectPartial(onThrow)(() => f(a)))
}
