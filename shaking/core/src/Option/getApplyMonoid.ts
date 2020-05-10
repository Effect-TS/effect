import type { Monoid } from "fp-ts/lib/Monoid"
import type { Option } from "fp-ts/lib/Option"

import { getApplySemigroup } from "./getApplySemigroup"
import { some } from "./some"

/**
 * @since 2.0.0
 */
export function getApplyMonoid<A>(M: Monoid<A>): Monoid<Option<A>> {
  return {
    ...getApplySemigroup(M),
    empty: some(M.empty)
  }
}
