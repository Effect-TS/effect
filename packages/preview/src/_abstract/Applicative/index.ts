import { CovariantF, CovariantK } from "../Covariant"
import { URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export type ApplicativeF<F> = IdentityBothF<F> & CovariantF<F>

export type ApplicativeK<F extends URIS> = IdentityBothK<F> & CovariantK<F>

export function makeApplicative<URI extends URIS>(
  _: URI
): (_: Omit<ApplicativeK<URI>, "URI">) => ApplicativeK<URI>
export function makeApplicative<URI>(
  URI: URI
): (_: Omit<ApplicativeF<URI>, "URI">) => ApplicativeF<URI>
export function makeApplicative<URI>(
  URI: URI
): (_: Omit<ApplicativeF<URI>, "URI">) => ApplicativeF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
