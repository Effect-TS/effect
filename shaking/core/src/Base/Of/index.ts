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

export interface COf<F> extends CFunctor<F> {
  readonly of: <A>(a: A) => HKT<F, A>
}
export interface COf1<F extends URIS> extends CFunctor1<F> {
  readonly of: <A>(a: A) => Kind<F, A>
}
export interface COf2<F extends URIS2> extends CFunctor2<F> {
  readonly of: <E, A>(a: A) => Kind2<F, E, A>
}
export interface COf2C<F extends URIS2, E> extends CFunctor2C<F, E> {
  readonly of: <A>(a: A) => Kind2<F, E, A>
}
export interface COf3<F extends URIS3> extends CFunctor3<F> {
  readonly of: <R, E, A>(a: A) => Kind3<F, R, E, A>
}
export interface COf3C<F extends URIS3, E> extends CFunctor3C<F, E> {
  readonly of: <R, A>(a: A) => Kind3<F, R, E, A>
}
export interface COf4<F extends URIS4> extends CFunctor4<F> {
  readonly of: <S, R, E, A>(a: A) => Kind4<F, S, R, E, A>
}
export interface COf4C<F extends MaURIS, E> extends CFunctor4C<F, E> {
  readonly of: <S, R, A>(a: A) => Kind4<F, S, R, E, A>
}
