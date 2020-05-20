import {
  CApply,
  CApply1,
  CApply2,
  CApply2C,
  CApply3,
  CApply3C,
  CApply4,
  CApply4MA,
  CApply4MAP,
  CApply4MAPC,
  CApply4MAC
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

export interface CChain<F> extends CApply<F> {
  readonly chain: <A, B>(f: (a: A) => HKT<F, B>) => (fa: HKT<F, A>) => HKT<F, B>
}
export interface CChain1<F extends URIS> extends CApply1<F> {
  readonly chain: <A, B>(f: (a: A) => Kind<F, B>) => (fa: Kind<F, A>) => Kind<F, B>
}
export interface CChain2<F extends URIS2> extends CApply2<F> {
  readonly chain: <E, A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (fa: Kind2<F, E, A>) => Kind2<F, E, B>
}
export interface CChain2C<F extends URIS2, E> extends CApply2C<F, E> {
  readonly chain: <A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (fa: Kind2<F, E, A>) => Kind2<F, E, B>
}
export interface CChain3<F extends URIS3> extends CApply3<F> {
  readonly chain: <R, E, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
}
export interface CChain3C<F extends URIS3, E> extends CApply3C<F, E> {
  readonly chain: <R, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
}
export interface CChain4<F extends URIS4> extends CApply4<F> {
  readonly chain: <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, B>
}
export interface CChain4MA<F extends MaURIS> extends CApply4MA<F> {
  readonly chain: <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <S2, R2, E2>(fa: Kind4<F, S2, R2, E2, A>) => Kind4<F, S | S2, R & R2, E | E2, B>
}
export interface CChain4MAC<F extends MaURIS, E> extends CApply4MAC<F, E> {
  readonly chain: <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <S2, R2, E2>(fa: Kind4<F, S2, R2, E2, A>) => Kind4<F, S | S2, R & R2, E | E2, B>
}
export interface CChain4MAP<F extends MaURIS> extends CApply4MAP<F> {
  readonly chain: <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <S2, R2, E2>(fa: Kind4<F, S2, R2, E2, A>) => Kind4<F, S | S2, R & R2, E | E2, B>
}
export interface CChain4MAPC<F extends MaURIS, E> extends CApply4MAPC<F, E> {
  readonly chain: <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <S2, R2, E2>(fa: Kind4<F, S2, R2, E2, A>) => Kind4<F, S | S2, R & R2, E | E2, B>
}
