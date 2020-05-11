import type { Either } from "./Either"

/**
 * Constructs a new `Either` holding a `Left` value. This usually represents a failure, due to the right-bias of this
 * structure
 *
 * @since 2.0.0
 */
export function left<E = never>(e: E): Either<E, never> {
  return { _tag: "Left", left: e }
}

export function leftW<E = never, A = never>(e: E): Either<E, A> {
  return { _tag: "Left", left: e }
}
