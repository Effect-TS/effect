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
  IdentityFlatten,
  IdentityFlatten1,
  IdentityFlatten2,
  IdentityFlatten3,
  IdentityFlatten4,
  IdentityFlatten5,
  IdentityFlatten6
} from "../IdentityFlatten"

export type Monad<F> = IdentityFlatten<F> & Covariant<F>

export type Monad1<F extends URIS> = IdentityFlatten1<F> & Covariant1<F>

export type Monad2<F extends URIS2> = IdentityFlatten2<F> & Covariant2<F>

export type Monad3<F extends URIS3> = IdentityFlatten3<F> & Covariant3<F>

export type Monad4<F extends URIS4> = IdentityFlatten4<F> & Covariant4<F>

export type Monad5<F extends URIS5> = IdentityFlatten5<F> & Covariant5<F>

export type Monad6<F extends URIS6> = IdentityFlatten6<F> & Covariant6<F>
