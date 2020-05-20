import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3, URIS4, Kind4 } from "../HKT"

export interface CFunctor<F> {
  readonly URI: F
  readonly _F: "curried"
  readonly map: <A, B>(f: (a: A) => B) => (fa: HKT<F, A>) => HKT<F, B>
}
export interface CFunctor1<F extends URIS> {
  readonly URI: F
  readonly _F: "curried"
  readonly map: <A, B>(f: (a: A) => B) => (fa: Kind<F, A>) => Kind<F, B>
}
export interface CFunctor2<F extends URIS2> {
  readonly URI: F
  readonly _F: "curried"
  readonly map: <A, B>(f: (a: A) => B) => <E>(fa: Kind2<F, E, A>) => Kind2<F, E, B>
}
export interface CFunctor2C<F extends URIS2, E> {
  readonly URI: F
  readonly _E: E
  readonly _F: "curried"
  readonly map: <A, B>(f: (a: A) => B) => (fa: Kind2<F, E, A>) => Kind2<F, E, B>
}
export interface CFunctor3<F extends URIS3> {
  readonly URI: F
  readonly _F: "curried"
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <R, E>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
}
export interface CFunctor3C<F extends URIS3, E> {
  readonly URI: F
  readonly _E: E
  readonly _F: "curried"
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <R>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
}
export interface CFunctor4<F extends URIS4> {
  readonly URI: F
  readonly _F: "curried"
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <S, R, E>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, B>
}
export interface CFunctor4C<F extends URIS4, E> {
  readonly URI: F
  readonly _F: "curried"
  readonly _E: E
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <S, R>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, B>
}
