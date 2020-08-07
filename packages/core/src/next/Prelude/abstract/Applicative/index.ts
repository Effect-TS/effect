import {
  Covariant,
  Covariant1,
  Covariant2,
  Covariant3,
  Covariant4,
  Covariant5,
  Covariant6
} from "../Covariant"
import { URIS, URIS2, URIS3, URIS4, URIS5, URIS6 } from "../HKT"
import {
  IdentityBoth,
  IdentityBoth1,
  IdentityBoth2,
  IdentityBoth3,
  IdentityBoth4,
  IdentityBoth5,
  IdentityBoth6
} from "../IdentityBoth"

export type Applicative<F> = IdentityBoth<F> & Covariant<F>

export type Applicative1<F extends URIS> = IdentityBoth1<F> & Covariant1<F>

export type Applicative2<F extends URIS2> = IdentityBoth2<F> & Covariant2<F>

export type Applicative3<F extends URIS3> = IdentityBoth3<F> & Covariant3<F>

export type Applicative4<F extends URIS4> = IdentityBoth4<F> & Covariant4<F>

export type Applicative5<F extends URIS5> = IdentityBoth5<F> & Covariant5<F>

export type Applicative6<F extends URIS6> = IdentityBoth6<F> & Covariant6<F>
