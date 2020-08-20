import type { AssociativeBothF, AssociativeBothK } from "../AssociativeBoth"
import type { URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface CommutativeBothF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends AssociativeBothF<F, TL0, TL1, TL2, TL3> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBothK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends AssociativeBothK<F, TL0, TL1, TL2, TL3> {
  readonly CommutativeBoth: "CommutativeBoth"
}
