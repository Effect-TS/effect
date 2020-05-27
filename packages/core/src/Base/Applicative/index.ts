/* adapted from https://github.com/gcanti/fp-ts */

import type {
  CApply,
  CApply1,
  CApply2,
  CApply2C,
  CApply3,
  CApply3C,
  CApply4,
  CApply4MA,
  CApply4MAC,
  CApply4MAP,
  CApply4MAPC
} from "../Apply"
import type { MaURIS, URIS, URIS2, URIS3, URIS4 } from "../HKT"
import { COf, COf1, COf2, COf2C, COf3, COf3C, COf4, COf4C } from "../Of"

export interface CApplicative<F> extends CApply<F>, COf<F> {}
export interface CApplicative1<F extends URIS> extends CApply1<F>, COf1<F> {}
export interface CApplicative2<F extends URIS2> extends CApply2<F>, COf2<F> {}
export interface CApplicative2C<F extends URIS2, E>
  extends CApply2C<F, E>,
    COf2C<F, E> {}
export interface CApplicative3<F extends URIS3> extends CApply3<F>, COf3<F> {}
export interface CApplicative3C<F extends URIS3, E>
  extends CApply3C<F, E>,
    COf3C<F, E> {}
export interface CApplicative4<F extends URIS4> extends CApply4<F>, COf4<F> {}
export interface CApplicative4MA<F extends MaURIS> extends CApply4MA<F>, COf4<F> {}
export interface CApplicative4MAC<F extends MaURIS, E>
  extends CApply4MAC<F, E>,
    COf4C<F, E> {}
export interface CApplicative4MAP<F extends MaURIS> extends CApply4MAP<F>, COf4<F> {}
export interface CApplicative4MAPC<F extends MaURIS, E>
  extends CApply4MAPC<F, E>,
    COf4C<F, E> {}
