import { Die, Fail, Interrupt, Stackless } from "@effect/core/io/Cause/definition"

/**
 * Linearizes this cause to a set of parallel causes where each parallel cause
 * contains a linear sequence of failures.
 *
 * @tsplus getter effect/core/io/Cause linearize
 */
export function linearize<E>(self: Cause<E>): HashSet<Cause<E>> {
  return self.fold(
    HashSet.empty<Cause<E>>(),
    (e) => HashSet.empty<Cause<E>>().add(new Fail(e)),
    (d) => HashSet.empty<Cause<E>>().add(new Die(d)),
    (fiberId) => HashSet.empty<Cause<E>>().add(new Interrupt(fiberId)),
    (left, right) => left.flatMap((l) => right.map((r) => l + r)),
    (left, right) => left.union(right),
    (cause, stackless) => cause.map((c) => new Stackless(c, stackless))
  )
}
