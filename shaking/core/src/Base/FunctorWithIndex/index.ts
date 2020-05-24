/* adapted from https://github.com/gcanti/fp-ts */

import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3, URIS4, Kind4 } from "../HKT"

export interface CFunctorWithIndex<F, I> {
  readonly URI: F
  readonly mapWithIndex: <A, B>(f: (i: I, a: A) => B) => (fa: HKT<F, A>) => HKT<F, B>
}
export interface CFunctorWithIndex1<F extends URIS, I> {
  readonly URI: F
  readonly mapWithIndex: <A, B>(f: (i: I, a: A) => B) => (fa: Kind<F, A>) => Kind<F, B>
}
export interface CFunctorWithIndex2<F extends URIS2, I> {
  readonly URI: F
  readonly mapWithIndex: <A, B>(
    f: (i: I, a: A) => B
  ) => <E>(fa: Kind2<F, E, A>) => Kind2<F, E, B>
}
export interface CFunctorWithIndex2C<F extends URIS2, I, E> {
  readonly URI: F
  readonly _E: E
  readonly mapWithIndex: <A, B>(
    f: (i: I, a: A) => B
  ) => (fa: Kind2<F, E, A>) => Kind2<F, E, B>
}
export interface CFunctorWithIndex3<F extends URIS3, I> {
  readonly URI: F
  readonly mapWithIndex: <A, B>(
    f: (i: I, a: A) => B
  ) => <R, E>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
}
export interface CFunctorWithIndex3C<F extends URIS3, I, E> {
  readonly URI: F
  readonly _E: E
  readonly mapWithIndex: <A, B>(
    f: (i: I, a: A) => B
  ) => <R>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
}
export interface CFunctorWithIndex4<F extends URIS4, I> {
  readonly URI: F
  readonly mapWithIndex: <A, B>(
    f: (i: I, a: A) => B
  ) => <S, R, E>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, B>
}
export interface CFunctorWithIndex4C<F extends URIS4, I, E> {
  readonly URI: F
  readonly mapWithIndex: <A, B>(
    f: (i: I, a: A) => B
  ) => <S, R>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, B>
}
