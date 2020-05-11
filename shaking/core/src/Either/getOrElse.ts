import type { Either } from "./Either"
import { isLeft } from "./isLeft"

/**
 * @since 2.0.0
 */
export function getOrElse<E, A>(onLeft: (e: E) => A): <B>(ma: Either<E, B>) => A | B {
  return (ma) => (isLeft(ma) ? onLeft(ma.left) : ma.right)
}
