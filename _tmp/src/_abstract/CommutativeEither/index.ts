import type { AssociativeEitherF, AssociativeEitherK } from "../AssociativeEither"
import type { URIS } from "../HKT"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface CommutativeEitherF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends AssociativeEitherF<F, TL0, TL1, TL2, TL3> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEitherK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends AssociativeEitherK<F, TL0, TL1, TL2, TL3> {
  readonly CommutativeEither: "CommutativeEither"
}
