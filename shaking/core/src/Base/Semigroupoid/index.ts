/* adapted from https://github.com/gcanti/fp-ts */

import type { HKT2, URIS2, Kind2, URIS3, Kind3, URIS4, Kind4 } from "../HKT"

export interface CSemigroupoid<F> {
  readonly URI: F
  readonly _F: "curried"
  readonly compose: <E, A, B>(la: HKT2<F, E, A>) => (ab: HKT2<F, A, B>) => HKT2<F, E, B>
}

export interface CSemigroupoid2<F extends URIS2> {
  readonly URI: F
  readonly _F: "curried"
  readonly compose: <E, A, B>(
    la: Kind2<F, E, A>
  ) => (ab: Kind2<F, A, B>) => Kind2<F, E, B>
}

export interface CSemigroupoid2C<F extends URIS2, E> {
  readonly URI: F
  readonly _E: E
  readonly _F: "curried"
  readonly compose: <A, B>(la: Kind2<F, E, A>) => (ab: Kind2<F, A, B>) => Kind2<F, E, B>
}

export interface CSemigroupoid3<F extends URIS3> {
  readonly URI: F
  readonly _F: "curried"
  readonly compose: <R, E, A, B>(
    la: Kind3<F, R, E, A>
  ) => (ab: Kind3<F, R, A, B>) => Kind3<F, R, E, B>
}

export interface CSemigroupoid3C<F extends URIS3, E> {
  readonly URI: F
  readonly _E: E
  readonly _F: "curried"
  readonly compose: <R, A, B>(
    la: Kind3<F, R, E, A>
  ) => (ab: Kind3<F, R, A, B>) => Kind3<F, R, E, B>
}

export interface CSemigroupoid4<F extends URIS4> {
  readonly URI: F
  readonly _F: "curried"
  readonly compose: <S, R, E, A, B>(
    la: Kind4<F, S, R, E, A>
  ) => (ab: Kind4<F, S, R, A, B>) => Kind4<F, S, R, E, B>
}
