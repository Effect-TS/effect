import { constant } from "@tsplus/stdlib/data/Function"

/**
 * A variant of `update` that allows specifying the function that will be used
 * to combine old values with new values.
 *
 * @tsplus static effect/core/io/Differ.Ops updateWith
 */
export function updateWith<A>(f: (x: A, y: A) => A): Differ<A, (a: A) => A> {
  return Differ.make({
    empty: identity,
    combine: (first, second) => {
      if (Equals.equals(first, identity)) {
        return second
      }
      if (Equals.equals(second, identity)) {
        return first
      }
      return (a) => second(first(a))
    },
    diff: (oldValue, newValue) => {
      if (Equals.equals(oldValue, newValue)) {
        return identity
      }
      return constant(newValue)
    },
    patch: (patch, oldValue) => f(oldValue, patch(oldValue))
  })
}
