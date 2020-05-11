import type { Eq } from "../Eq"

import type { Either } from "./Either"
import { isLeft } from "./isLeft"

/**
 * @since 2.0.0
 */
export function elem<A>(E: Eq<A>): <E>(a: A, ma: Either<E, A>) => boolean {
  return (a, ma) => (isLeft(ma) ? false : E.equals(a, ma.right))
}
