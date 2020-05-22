import {
  CFunctor,
  CFunctor1,
  CFunctor2,
  CFunctor2C,
  CFunctor3,
  CFunctor3C,
  CFunctor4,
  CFunctor4C
} from "../Functor"
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

export interface CChain<F> extends CFunctor<F> {
  readonly chain: <A, B>(f: (a: A) => HKT<F, B>) => (fa: HKT<F, A>) => HKT<F, B>
}
export interface CChain1<F extends URIS> extends CFunctor1<F> {
  readonly chain: <A, B>(f: (a: A) => Kind<F, B>) => (fa: Kind<F, A>) => Kind<F, B>
}
export interface CChain2<F extends URIS2> extends CFunctor2<F> {
  readonly chain: <E, A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (fa: Kind2<F, E, A>) => Kind2<F, E, B>
}
export interface CChain2C<F extends URIS2, E> extends CFunctor2C<F, E> {
  readonly chain: <A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (fa: Kind2<F, E, A>) => Kind2<F, E, B>
}
export interface CChain3<F extends URIS3> extends CFunctor3<F> {
  readonly chain: <R, E, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
}
export interface CChain3C<F extends URIS3, E> extends CFunctor3C<F, E> {
  readonly chain: <R, A, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
}
export interface CChain4<F extends URIS4> extends CFunctor4<F> {
  readonly chain: <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, B>
}
export interface CChain4C<F extends URIS4, E> extends CFunctor4C<F, E> {
  readonly chain: <S, R, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, B>
}
export interface CChain4MA<F extends MaURIS> extends CFunctor4<F> {
  readonly chain: <S, R, E, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <S2, R2, E2>(fa: Kind4<F, S2, R2, E2, A>) => Kind4<F, S | S2, R & R2, E | E2, B>
}
export interface CChain4MAC<F extends MaURIS, E> extends CFunctor4C<F, E> {
  readonly chain: <S, R, A, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <S2, R2>(fa: Kind4<F, S2, R2, E, A>) => Kind4<F, S | S2, R & R2, E, B>
}
