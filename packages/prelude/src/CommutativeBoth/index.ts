import type { Auto, URIS } from "@effect-ts/hkt"

import type { AssociativeBoth } from "../AssociativeBoth"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface CommutativeBoth<F extends URIS, C = Auto>
  extends AssociativeBoth<F, C> {
  readonly _CommutativeBoth: "CommutativeBoth"
}
