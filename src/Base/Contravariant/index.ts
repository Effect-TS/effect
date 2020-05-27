/* adapted from https://github.com/gcanti/fp-ts */

import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3, URIS4, Kind4 } from "../HKT"

export interface CContravariant<F> {
  readonly URI: F
  readonly contramap: <A, B>(f: (b: B) => A) => (fa: HKT<F, A>) => HKT<F, B>
}

export interface CContravariant1<F extends URIS> {
  readonly URI: F
  readonly contramap: <A, B>(f: (b: B) => A) => (fa: Kind<F, A>) => Kind<F, B>
}

export interface CContravariant2<F extends URIS2> {
  readonly URI: F
  readonly contramap: <A, B>(
    f: (b: B) => A
  ) => <E>(fa: Kind2<F, E, A>) => Kind2<F, E, B>
}

export interface CContravariant2C<F extends URIS2, E> {
  readonly URI: F
  readonly _E: E
  readonly contramap: <A, B>(f: (b: B) => A) => (fa: Kind2<F, E, A>) => Kind2<F, E, B>
}

export interface CContravariant3<F extends URIS3> {
  readonly URI: F
  readonly contramap: <A, B>(
    f: (b: B) => A
  ) => <R, E>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
}

export interface CContravariant3C<F extends URIS3, E> {
  readonly URI: F
  readonly contramap: <A, B>(
    f: (b: B) => A
  ) => <R>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
}

export interface CContravariant4<F extends URIS4> {
  readonly URI: F
  readonly contramap: <A, B>(
    f: (b: B) => A
  ) => <S, R, E>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, B>
}
