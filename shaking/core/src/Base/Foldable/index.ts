/* adapted from https://github.com/gcanti/fp-ts */

import type { Monoid } from "../../Monoid"
import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3, URIS4, Kind4 } from "../HKT"

export interface CFoldable<F> {
  readonly URI: F
  readonly reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: HKT<F, A>) => B
  readonly foldMap: <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: HKT<F, A>) => M
  readonly reduceRight: <A, B>(b: B, f: (a: A, b: B) => B) => (fa: HKT<F, A>) => B
}
export interface CFoldable1<F extends URIS> {
  readonly URI: F
  readonly reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Kind<F, A>) => B
  readonly foldMap: <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Kind<F, A>) => M
  readonly reduceRight: <A, B>(b: B, f: (a: A, b: B) => B) => (fa: Kind<F, A>) => B
}
export interface CFoldable2<F extends URIS2> {
  readonly URI: F
  readonly reduce: <A, B>(b: B, f: (b: B, a: A) => B) => <E>(fa: Kind2<F, E, A>) => B
  readonly foldMap: <M>(
    M: Monoid<M>
  ) => <A>(f: (a: A) => M) => <E>(fa: Kind2<F, E, A>) => M
  readonly reduceRight: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <E>(fa: Kind2<F, E, A>) => B
}
export interface CFoldable2C<F extends URIS2, E> {
  readonly URI: F
  readonly _E: E
  readonly reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Kind2<F, E, A>) => B
  readonly foldMap: <M>(
    M: Monoid<M>
  ) => <A>(f: (a: A) => M) => (fa: Kind2<F, E, A>) => M
  readonly reduceRight: <A, B>(b: B, f: (a: A, b: B) => B) => (fa: Kind2<F, E, A>) => B
}
export interface CFoldable3<F extends URIS3> {
  readonly URI: F
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <R, E>(fa: Kind3<F, R, E, A>) => B
  readonly foldMap: <M>(
    M: Monoid<M>
  ) => <A>(f: (a: A) => M) => <R, E>(fa: Kind3<F, R, E, A>) => M
  readonly reduceRight: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <R, E>(fa: Kind3<F, R, E, A>) => B
}
export interface CFoldable3C<F extends URIS3, E> {
  readonly URI: F
  readonly _E: E
  readonly reduce: <A, B>(b: B, f: (b: B, a: A) => B) => <R>(fa: Kind3<F, R, E, A>) => B
  readonly foldMap: <M>(
    M: Monoid<M>
  ) => <A>(f: (a: A) => M) => <R>(fa: Kind3<F, R, E, A>) => M
  readonly reduceRight: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <R>(fa: Kind3<F, R, E, A>) => B
}
export interface CFoldable4<F extends URIS4> {
  readonly URI: F
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <S, R, E>(fa: Kind4<F, S, R, E, A>) => B
  readonly foldMap: <M>(
    M: Monoid<M>
  ) => <A>(f: (a: A) => M) => <S, R, E>(fa: Kind4<F, S, R, E, A>) => M
  readonly reduceRight: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <S, R, E>(fa: Kind4<F, S, R, E, A>) => B
}
