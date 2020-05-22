/* adapted from https://github.com/gcanti/fp-ts */

import type {
  CFunctor,
  CFunctor1,
  CFunctor2,
  CFunctor2C,
  CFunctor3,
  CFunctor3C,
  CFunctor4,
  CFunctor4C
} from "../Functor"
import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3, URIS4, Kind4 } from "../HKT"

export interface CAlt<F> extends CFunctor<F> {
  readonly alt: <A>(fy: () => HKT<F, A>) => (fx: HKT<F, A>) => HKT<F, A>
}

export interface CAlt1<F extends URIS> extends CFunctor1<F> {
  readonly alt: <A>(fy: () => Kind<F, A>) => (fx: Kind<F, A>) => Kind<F, A>
}

export interface CAlt2<F extends URIS2> extends CFunctor2<F> {
  readonly alt: <E, A>(
    fy: () => Kind2<F, E, A>
  ) => (fx: Kind2<F, E, A>) => Kind2<F, E, A>
}

export interface CAlt2C<F extends URIS2, E> extends CFunctor2C<F, E> {
  readonly alt: <A>(fy: () => Kind2<F, E, A>) => (fx: Kind2<F, E, A>) => Kind2<F, E, A>
}

export interface CAlt3<F extends URIS3> extends CFunctor3<F> {
  readonly alt: <R, E, A>(
    fy: () => Kind3<F, R, E, A>
  ) => (fx: Kind3<F, R, E, A>) => Kind3<F, R, E, A>
}

export interface CAlt3C<F extends URIS3, E> extends CFunctor3C<F, E> {
  readonly alt: <R, A>(
    fy: () => Kind3<F, R, E, A>
  ) => (fx: Kind3<F, R, E, A>) => Kind3<F, R, E, A>
}

export interface CAlt4<F extends URIS4> extends CFunctor4<F> {
  readonly alt: <S, R, E, A>(
    fy: () => Kind4<F, S, R, E, A>
  ) => (fx: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, A>
}

export interface CAlt4MA<F extends URIS4> extends CFunctor4<F> {
  readonly alt: <S, R, E, A>(
    fy: () => Kind4<F, S, R, E, A>
  ) => <S2, R2, E2, A2>(
    fx: Kind4<F, S2, R2, E2, A2>
  ) => Kind4<F, S | S2, R & R2, E | E2, A | A2>
}

export interface CAlt4MAC<F extends URIS4, E> extends CFunctor4C<F, E> {
  readonly alt: <S, R, A>(
    fy: () => Kind4<F, S, R, E, A>
  ) => <S2, R2, A2>(fx: Kind4<F, S2, R2, E, A2>) => Kind4<F, S | S2, R & R2, E, A | A2>
}
