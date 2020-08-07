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

export interface Monad<F> extends IdentityFlatten<F>, Covariant<F> {}

export interface Monad1<F extends URIS> extends IdentityFlatten1<F>, Covariant1<F> {}

export interface Monad2<F extends URIS2> extends IdentityFlatten2<F>, Covariant2<F> {}

export interface Monad3<F extends URIS3> extends IdentityFlatten3<F>, Covariant3<F> {}

export interface Monad4<F extends URIS4> extends IdentityFlatten4<F>, Covariant4<F> {}

export interface Monad5<F extends URIS5> extends IdentityFlatten5<F>, Covariant5<F> {}

export interface Monad6<F extends URIS6> extends IdentityFlatten6<F>, Covariant6<F> {}
