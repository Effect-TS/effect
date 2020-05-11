import type { Eq } from "./Eq"

/**
 * @since 2.0.0
 */
export function fromEquals<A>(equals: (x: A, y: A) => boolean): Eq<A> {
  return {
    equals: (x, y) => x === y || equals(x, y)
  }
}
