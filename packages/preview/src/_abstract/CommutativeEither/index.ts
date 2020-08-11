import { AssociativeEitherK, AssociativeEitherF } from "../AssociativeEither"
import { URIS } from "../HKT"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface CommutativeEitherF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends AssociativeEitherF<F, Fix0, Fix1, Fix2, Fix3> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEitherK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends AssociativeEitherK<F, Fix0, Fix1, Fix2, Fix3> {
  readonly CommutativeEither: "CommutativeEither"
}

export function makeCommutativeEither<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    CommutativeEitherK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "CommutativeEither"
  >
) => CommutativeEitherK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeCommutativeEither<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    CommutativeEitherF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "CommutativeEither"
  >
) => CommutativeEitherF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeCommutativeEither<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    CommutativeEitherF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "CommutativeEither"
  >
) => CommutativeEitherF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    CommutativeEither: "CommutativeEither",
    ..._
  })
}
