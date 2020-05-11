import type { Either } from "./Either"

/**
 * Constructs a new `Either` holding a `Right` value. This usually represents a successful value due to the right bias
 * of this structure
 *
 * @since 2.0.0
 */
export function right<A = never>(a: A): Either<never, A> {
  return { _tag: "Right", right: a }
}

export function rightW<E = never, A = never>(a: A): Either<E, A> {
  return { _tag: "Right", right: a }
}
