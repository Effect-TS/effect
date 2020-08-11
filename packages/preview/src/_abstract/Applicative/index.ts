import { CovariantF, CovariantK } from "../Covariant"
import { URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export type ApplicativeF<
  F,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> = IdentityBothF<F, Fix0, Fix1, Fix2, Fix3> & CovariantF<F, Fix0, Fix1, Fix2, Fix3>

export type ApplicativeK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> = IdentityBothK<F, Fix0, Fix1, Fix2, Fix3> & CovariantK<F, Fix0, Fix1, Fix2, Fix3>

export function makeApplicative<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    ApplicativeK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => ApplicativeK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeApplicative<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    ApplicativeF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => ApplicativeF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeApplicative<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    ApplicativeF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => ApplicativeF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    ..._
  })
}
