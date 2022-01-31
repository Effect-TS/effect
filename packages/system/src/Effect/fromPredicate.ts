// ets_tracing: off

import type { Predicate, Refinement } from "../Function/index.js"
import * as core from "./core.js"
import type { IO } from "./effect.js"
import * as fail from "./fail.js"

/**
 * Lift a predicate into an effectful function
 */
export function fromPredicate<E, A, B extends A>(
  refinement: Refinement<A, B>,
  onFalse: (a: A) => E
): (a: A) => IO<E, B>
export function fromPredicate<E, A>(
  predicate: Predicate<A>,
  onFalse: (a: A) => E
): (a: A) => IO<E, A>
export function fromPredicate<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) {
  return (a: A): IO<E, A> =>
    core.suspend(() => (predicate(a) ? core.succeed(a) : fail.fail(onFalse(a))))
}
