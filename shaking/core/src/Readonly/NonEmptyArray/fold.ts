import type { Semigroup } from "../../Semigroup"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.0
 */
export function fold<A>(S: Semigroup<A>): (fa: ReadonlyNonEmptyArray<A>) => A {
  return (fa) => fa.reduce(S.concat)
}
