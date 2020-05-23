/* adapted from https://github.com/gcanti/fp-ts */

import type { Monoid } from "../../Monoid"
import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3, URIS4, Kind4 } from "../HKT"

export interface CFoldableWithIndex<F, I> {
  readonly URI: F
  readonly reduceWithIndex: <A, B>(
    b: B,
    f: (i: I, b: B, a: A) => B
  ) => (fa: HKT<F, A>) => B
  readonly foldMapWithIndex: <M>(
    M: Monoid<M>
  ) => <A>(f: (i: I, a: A) => M) => (fa: HKT<F, A>) => M
  readonly reduceRightWithIndex: <A, B>(
    b: B,
    f: (i: I, a: A, b: B) => B
  ) => (fa: HKT<F, A>) => B
}
export interface CFoldableWithIndex1<F extends URIS, I> {
  readonly URI: F
  readonly reduceWithIndex: <A, B>(
    b: B,
    f: (i: I, b: B, a: A) => B
  ) => (fa: Kind<F, A>) => B
  readonly foldMapWithIndex: <M>(
    M: Monoid<M>
  ) => <A>(f: (i: I, a: A) => M) => (fa: Kind<F, A>) => M
  readonly reduceRightWithIndex: <A, B>(
    b: B,
    f: (i: I, a: A, b: B) => B
  ) => (fa: Kind<F, A>) => B
}
export interface CFoldableWithIndex2<F extends URIS2, I> {
  readonly URI: F
  readonly reduceWithIndex: <A, B>(
    b: B,
    f: (i: I, b: B, a: A) => B
  ) => <E>(fa: Kind2<F, E, A>) => B
  readonly foldMapWithIndex: <M>(
    M: Monoid<M>
  ) => <A>(f: (i: I, a: A) => M) => <E>(fa: Kind2<F, E, A>) => M
  readonly reduceRightWithIndex: <A, B>(
    b: B,
    f: (i: I, a: A, b: B) => B
  ) => <E>(fa: Kind2<F, E, A>) => B
}
export interface CFoldableWithIndex2C<F extends URIS2, I, E> {
  readonly URI: F
  readonly _E: E
  readonly reduceWithIndex: <A, B>(
    b: B,
    f: (i: I, b: B, a: A) => B
  ) => (fa: Kind2<F, E, A>) => B
  readonly foldMapWithIndex: <M>(
    M: Monoid<M>
  ) => <A>(f: (i: I, a: A) => M) => (fa: Kind2<F, E, A>) => M
  readonly reduceRightWithIndex: <A, B>(
    b: B,
    f: (i: I, a: A, b: B) => B
  ) => (fa: Kind2<F, E, A>) => B
}
export interface CFoldableWithIndex3<F extends URIS3, I> {
  readonly URI: F
  readonly reduceWithIndex: <A, B>(
    b: B,
    f: (i: I, b: B, a: A) => B
  ) => <R, E>(fa: Kind3<F, R, E, A>) => B
  readonly foldMapWithIndex: <M>(
    M: Monoid<M>
  ) => <A>(f: (i: I, a: A) => M) => <R, E>(fa: Kind3<F, R, E, A>) => M
  readonly reduceRightWithIndex: <A, B>(
    b: B,
    f: (i: I, a: A, b: B) => B
  ) => <R, E>(fa: Kind3<F, R, E, A>) => B
}
export interface CFoldableWithIndex3C<F extends URIS3, I, E> {
  readonly URI: F
  readonly _E: E
  readonly reduceWithIndex: <A, B>(
    b: B,
    f: (i: I, b: B, a: A) => B
  ) => <R>(fa: Kind3<F, R, E, A>) => B
  readonly foldMapWithIndex: <M>(
    M: Monoid<M>
  ) => <A>(f: (i: I, a: A) => M) => <R>(fa: Kind3<F, R, E, A>) => M
  readonly reduceRightWithIndex: <A, B>(
    b: B,
    f: (i: I, a: A, b: B) => B
  ) => <R>(fa: Kind3<F, R, E, A>) => B
}
export interface CFoldableWithIndex4<F extends URIS4, I> {
  readonly URI: F
  readonly reduceWithIndex: <A, B>(
    b: B,
    f: (i: I, b: B, a: A) => B
  ) => <S, R, E>(fa: Kind4<F, S, R, E, A>) => B
  readonly foldMapWithIndex: <M>(
    M: Monoid<M>
  ) => <A>(f: (i: I, a: A) => M) => <S, R, E>(fa: Kind4<F, S, R, E, A>) => M
  readonly reduceRightWithIndex: <A, B>(
    b: B,
    f: (i: I, a: A, b: B) => B
  ) => <S, R, E>(fa: Kind4<F, S, R, E, A>) => B
}
