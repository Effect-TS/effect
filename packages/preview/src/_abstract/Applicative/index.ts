import { CovariantF, CovariantK } from "../Covariant"
import { URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export type ApplicativeF<F, Fix = any> = IdentityBothF<F, Fix> & CovariantF<F, Fix>

export type ApplicativeK<F extends URIS, Fix = any> = IdentityBothK<F, Fix> &
  CovariantK<F, Fix>

export function makeApplicative<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<ApplicativeK<URI, Fix>, "URI" | "Fix">) => ApplicativeK<URI, Fix>
export function makeApplicative<URI, Fix = any>(
  URI: URI
): (_: Omit<ApplicativeF<URI, Fix>, "URI" | "Fix">) => ApplicativeF<URI, Fix>
export function makeApplicative<URI, Fix = any>(
  URI: URI
): (_: Omit<ApplicativeF<URI, Fix>, "URI" | "Fix">) => ApplicativeF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    ..._
  })
}
