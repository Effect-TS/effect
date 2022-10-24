import { Die, Fail, Interrupt, Stackless } from "@effect/core/io/Cause/definition"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Linearizes this cause to a set of parallel causes where each parallel cause
 * contains a linear sequence of failures.
 *
 * @tsplus getter effect/core/io/Cause linearize
 * @category mutations
 * @since 1.0.0
 */
export function linearize<E>(self: Cause<E>): HashSet.HashSet<Cause<E>> {
  return self.fold(
    HashSet.empty<Cause<E>>(),
    (e) => pipe(HashSet.empty(), HashSet.add(new Fail(e))),
    (d) => pipe(HashSet.empty(), HashSet.add(new Die(d))),
    (fiberId) => pipe(HashSet.empty(), HashSet.add(new Interrupt(fiberId))),
    (left, right) => pipe(left, HashSet.flatMap((l) => pipe(right, HashSet.map((r) => l + r)))),
    (left, right) => pipe(left, HashSet.union(right)),
    (cause, stackless) => pipe(cause, HashSet.map((c) => new Stackless(c, stackless)))
  )
}
