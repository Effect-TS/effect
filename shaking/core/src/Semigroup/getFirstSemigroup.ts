import { Semigroup } from "fp-ts/lib/Semigroup"

import { identity } from "../Function"
/**
 * @since 2.0.0
 */
export function getFirstSemigroup<A = never>(): Semigroup<A> {
  return { concat: identity }
}
