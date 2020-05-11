import type { Either } from "./Either"
import { isLeft } from "./isLeft"

/**
 * @since 2.0.0
 */
export function orElse<E, A, M>(
  onLeft: (e: E) => Either<M, A>
): (ma: Either<E, A>) => Either<M, A> {
  return (ma) => (isLeft(ma) ? onLeft(ma.left) : ma)
}
