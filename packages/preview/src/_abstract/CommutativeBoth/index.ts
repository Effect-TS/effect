import { AssociativeBothK, AssociativeBothF } from "../AssociativeBoth"
import { URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface CommutativeBothF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends AssociativeBothF<F, Fix0, Fix1, Fix2, Fix3> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBothK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends AssociativeBothK<F, Fix0, Fix1, Fix2, Fix3> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export function makeCommutativeBoth<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    CommutativeBothK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "CommutativeBoth"
  >
) => CommutativeBothK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeCommutativeBoth<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    CommutativeBothF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "CommutativeBoth"
  >
) => CommutativeBothF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeCommutativeBoth<
  URI,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  URI: URI
): (
  _: Omit<
    CommutativeBothF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "CommutativeBoth"
  >
) => CommutativeBothF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    CommutativeBoth: "CommutativeBoth",
    ..._
  })
}
