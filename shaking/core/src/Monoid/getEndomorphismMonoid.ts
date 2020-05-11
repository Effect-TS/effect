import { Endomorphism, identity } from "../Function"

import type { Monoid } from "./Monoid"

/**
 * @since 2.0.0
 */
export function getEndomorphismMonoid<A = never>(): Monoid<Endomorphism<A>> {
  return {
    concat: (x, y) => (a) => x(y(a)),
    empty: identity
  }
}
