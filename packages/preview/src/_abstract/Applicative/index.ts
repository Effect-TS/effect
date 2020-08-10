import { CovariantF, CovariantFE, CovariantK, CovariantKE } from "../Covariant"
import { URIS } from "../HKT"
import {
  IdentityBothF,
  IdentityBothFE,
  IdentityBothK,
  IdentityBothKE
} from "../IdentityBoth"

export type ApplicativeF<F> = IdentityBothF<F> & CovariantF<F>

export type ApplicativeFE<F, E> = IdentityBothFE<F, E> & CovariantFE<F, E>

export type ApplicativeK<F extends URIS> = IdentityBothK<F> & CovariantK<F>

export type ApplicativeKE<F extends URIS, E> = IdentityBothKE<F, E> & CovariantKE<F, E>

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

export function makeApplicativeE<URI extends URIS>(
  _: URI
): <E>() => (_: Omit<ApplicativeKE<URI, E>, "URI" | "E">) => ApplicativeKE<URI, E>
export function makeApplicativeE<URI>(
  URI: URI
): <E>() => (_: Omit<ApplicativeFE<URI, E>, "URI" | "E">) => ApplicativeFE<URI, E>
export function makeApplicativeE<URI>(
  URI: URI
): <E>() => (_: Omit<ApplicativeFE<URI, E>, "URI" | "E">) => ApplicativeFE<URI, E> {
  return () => (_) => ({
    URI,
    E: undefined as any,
    ..._
  })
}
