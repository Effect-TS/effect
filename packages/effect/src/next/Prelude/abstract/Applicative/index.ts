import {
  CovariantF,
  Covariant1,
  Covariant2,
  Covariant3,
  Covariant4,
  Covariant5,
  Covariant6
} from "../Covariant"
import { URIS, URIS2, URIS3, URIS4, URIS5, URIS6 } from "../HKT"
import {
  IdentityBothF,
  IdentityBoth1,
  IdentityBoth2,
  IdentityBoth3,
  IdentityBoth4,
  IdentityBoth5,
  IdentityBoth6
} from "../IdentityBoth"

export type ApplicativeF<F> = IdentityBothF<F> & CovariantF<F>

export type Applicative1<F extends URIS> = IdentityBoth1<F> & Covariant1<F>

export type Applicative2<F extends URIS2> = IdentityBoth2<F> & Covariant2<F>

export type Applicative3<F extends URIS3> = IdentityBoth3<F> & Covariant3<F>

export type Applicative4<F extends URIS4> = IdentityBoth4<F> & Covariant4<F>

export type Applicative5<F extends URIS5> = IdentityBoth5<F> & Covariant5<F>

export type Applicative6<F extends URIS6> = IdentityBoth6<F> & Covariant6<F>

export function makeApplicative<URI extends URIS>(
  _: URI
): (_: Omit<Applicative1<URI>, "URI">) => Applicative1<URI>
export function makeApplicative<URI extends URIS2>(
  _: URI
): (_: Omit<Applicative2<URI>, "URI">) => Applicative2<URI>
export function makeApplicative<URI extends URIS3>(
  _: URI
): (_: Omit<Applicative3<URI>, "URI">) => Applicative3<URI>
export function makeApplicative<URI extends URIS4>(
  _: URI
): (_: Omit<Applicative4<URI>, "URI">) => Applicative4<URI>
export function makeApplicative<URI extends URIS5>(
  _: URI
): (_: Omit<Applicative5<URI>, "URI">) => Applicative5<URI>
export function makeApplicative<URI extends URIS6>(
  _: URI
): (_: Omit<Applicative6<URI>, "URI">) => Applicative6<URI>
export function makeApplicative<URI>(
  URI: URI
): (_: Omit<ApplicativeF<URI>, "URI">) => ApplicativeF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
