/* adapted from https://github.com/gcanti/fp-ts */

import type { Option } from "../../Option"
import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3 } from "../HKT"

export interface CUnfoldable<F> {
  readonly URI: F
  readonly _F: "curried"
  readonly unfold: <A, B>(b: B, f: (b: B) => Option<[A, B]>) => HKT<F, A>
}

export interface CUnfoldable1<F extends URIS> {
  readonly URI: F
  readonly _F: "curried"
  readonly unfold: <A, B>(b: B, f: (b: B) => Option<[A, B]>) => Kind<F, A>
}

export interface CUnfoldable2<F extends URIS2> {
  readonly URI: F
  readonly _F: "curried"
  readonly unfold: <E, A, B>(b: B, f: (b: B) => Option<[A, B]>) => Kind2<F, E, A>
}

export interface CUnfoldable2C<F extends URIS2, E> {
  readonly URI: F
  readonly _E: E
  readonly _F: "curried"
  readonly unfold: <A, B>(b: B, f: (b: B) => Option<[A, B]>) => Kind2<F, E, A>
}

export interface CUnfoldable3<F extends URIS3> {
  readonly URI: F
  readonly _F: "curried"
  readonly unfold: <R, E, A, B>(b: B, f: (b: B) => Option<[A, B]>) => Kind3<F, R, E, A>
}
