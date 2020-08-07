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

export interface Applicative<F> extends IdentityBoth<F>, Covariant<F> {}

export interface Applicative1<F extends URIS> extends IdentityBoth1<F>, Covariant1<F> {}

export interface Applicative2<F extends URIS2>
  extends IdentityBoth2<F>,
    Covariant2<F> {}

export interface Applicative3<F extends URIS3>
  extends IdentityBoth3<F>,
    Covariant3<F> {}

export interface Applicative4<F extends URIS4>
  extends IdentityBoth4<F>,
    Covariant4<F> {}

export interface Applicative5<F extends URIS5>
  extends IdentityBoth5<F>,
    Covariant5<F> {}

export interface Applicative6<F extends URIS6>
  extends IdentityBoth6<F>,
    Covariant6<F> {}
