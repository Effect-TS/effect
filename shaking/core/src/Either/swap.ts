import type { Either } from "./Either"
import { isLeft } from "./isLeft"
import { left } from "./left"
import { right } from "./right"

/**
 * @since 2.0.0
 */
export function swap<E, A>(ma: Either<E, A>): Either<A, E> {
  return isLeft(ma) ? right(ma.left) : left(ma.right)
}
