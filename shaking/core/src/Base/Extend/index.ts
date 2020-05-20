import type {
  CFunctor,
  CFunctor1,
  CFunctor2,
  CFunctor2C,
  CFunctor3,
  CFunctor3C,
  CFunctor4
} from "../Functor"
import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3, URIS4, Kind4 } from "../HKT"

export interface CExtend<W> extends CFunctor<W> {
  readonly extend: <A, B>(f: (wa: HKT<W, A>) => B) => (wa: HKT<W, A>) => HKT<W, B>
}

export interface CExtend1<W extends URIS> extends CFunctor1<W> {
  readonly extend: <A, B>(f: (wa: Kind<W, A>) => B) => (wa: Kind<W, A>) => Kind<W, B>
}

export interface CExtend2<W extends URIS2> extends CFunctor2<W> {
  readonly extend: <E, A, B>(
    f: (wa: Kind2<W, E, A>) => B
  ) => (wa: Kind2<W, E, A>) => Kind2<W, E, B>
}

export interface CExtend2C<W extends URIS2, E> extends CFunctor2C<W, E> {
  readonly extend: <A, B>(
    f: (wa: Kind2<W, E, A>) => B
  ) => (wa: Kind2<W, E, A>) => Kind2<W, E, B>
}

export interface CExtend3<W extends URIS3> extends CFunctor3<W> {
  readonly extend: <R, E, A, B>(
    f: (wa: Kind3<W, R, E, A>) => B
  ) => (wa: Kind3<W, R, E, A>) => Kind3<W, R, E, B>
}

export interface CExtend3C<W extends URIS3, E> extends CFunctor3C<W, E> {
  readonly extend: <R, A, B>(
    f: (wa: Kind3<W, R, E, A>) => B
  ) => (wa: Kind3<W, R, E, A>) => Kind3<W, R, E, B>
}

export interface CExtend4<W extends URIS4> extends CFunctor4<W> {
  readonly extend: <S, R, E, A, B>(
    f: (wa: Kind4<W, S, R, E, A>) => B
  ) => (wa: Kind4<W, S, R, E, A>) => Kind4<W, S, R, E, B>
}
