import type {
  CApply,
  CApply1,
  CApply2,
  CApply2C,
  CApply3,
  CApply3C,
  CApply4,
  CApply4MA,
  CApply4MAP,
  CApply4MAC,
  CApply4MAPC
} from "../Apply"
import type {
  HKT,
  URIS,
  Kind,
  URIS2,
  Kind2,
  URIS3,
  Kind3,
  URIS4,
  Kind4,
  MaURIS
} from "../HKT"

export interface CApplicative<F> extends CApply<F> {
  readonly of: <A>(a: A) => HKT<F, A>
}
export interface CApplicative1<F extends URIS> extends CApply1<F> {
  readonly of: <A>(a: A) => Kind<F, A>
}
export interface CApplicative2<F extends URIS2> extends CApply2<F> {
  readonly of: <E, A>(a: A) => Kind2<F, E, A>
}
export interface CApplicative2C<F extends URIS2, E> extends CApply2C<F, E> {
  readonly of: <A>(a: A) => Kind2<F, E, A>
}
export interface CApplicative3<F extends URIS3> extends CApply3<F> {
  readonly of: <R, E, A>(a: A) => Kind3<F, R, E, A>
}
export interface CApplicative3C<F extends URIS3, E> extends CApply3C<F, E> {
  readonly of: <R, A>(a: A) => Kind3<F, R, E, A>
}
export interface CApplicative4<F extends URIS4> extends CApply4<F> {
  readonly of: <S, R, E, A>(a: A) => Kind4<F, S, R, E, A>
}
export interface CApplicative4MA<F extends MaURIS> extends CApply4MA<F> {
  readonly of: <S, R, E, A>(a: A) => Kind4<F, S, R, E, A>
}
export interface CApplicative4MAC<F extends MaURIS, E> extends CApply4MAC<F, E> {
  readonly of: <S, R, A>(a: A) => Kind4<F, S, R, E, A>
}
export interface CApplicative4MAP<F extends MaURIS> extends CApply4MAP<F> {
  readonly of: <S, R, E, A>(a: A) => Kind4<F, S, R, E, A>
}
export interface CApplicative4MAPC<F extends MaURIS, E> extends CApply4MAPC<F, E> {
  readonly of: <S, R, A>(a: A) => Kind4<F, S, R, E, A>
}
