import type { CAlt, CAlt1, CAlt2, CAlt2C, CAlt3 } from "../Alt"
import type {
  CApplicative,
  CApplicative1,
  CApplicative2,
  CApplicative2C,
  CApplicative3
} from "../Applicative"
import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3 } from "../HKT"

export interface CAlternative<F> extends CApplicative<F>, CAlt<F> {
  readonly zero: <A>() => HKT<F, A>
}

export interface CAlternative1<F extends URIS> extends CApplicative1<F>, CAlt1<F> {
  readonly zero: <A>() => Kind<F, A>
}

export interface CAlternative2<F extends URIS2> extends CApplicative2<F>, CAlt2<F> {
  readonly zero: <E, A>() => Kind2<F, E, A>
}

export interface CAlternative2C<F extends URIS2, E>
  extends CApplicative2C<F, E>,
    CAlt2C<F, E> {
  readonly zero: <A>() => Kind2<F, E, A>
}

export interface CAlternative3<F extends URIS3> extends CApplicative3<F>, CAlt3<F> {
  readonly zero: <R, E, A>() => Kind3<F, R, E, A>
}
