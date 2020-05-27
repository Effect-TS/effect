/* adapted from https://github.com/gcanti/fp-ts */

import type {
  CApplicative3,
  CApplicative3C,
  CApplicative2,
  CApplicative2C,
  CApplicative1,
  CApplicative,
  CApplicative4,
  CApplicative4MA,
  CApplicative4MAP,
  CApplicative4MAC,
  CApplicative4MAPC
} from "../Applicative"
import type {
  CFoldable,
  CFoldable1,
  CFoldable2,
  CFoldable2C,
  CFoldable3
} from "../Foldable"
import type { CFunctor, CFunctor1, CFunctor2, CFunctor2C, CFunctor3 } from "../Functor"
import type {
  URIS,
  URIS2,
  URIS3,
  HKT,
  Kind3,
  Kind2,
  Kind,
  URIS4,
  Kind4,
  MaURIS
} from "../HKT"

export interface CTraversable<T> extends CFunctor<T>, CFoldable<T> {
  readonly traverse: CTraverse<T>
  readonly sequence: CSequence<T>
}

export interface CTraversable1<T extends URIS> extends CFunctor1<T>, CFoldable1<T> {
  readonly traverse: CTraverse1<T>
  readonly sequence: CSequence1<T>
}

export interface CTraversable2<T extends URIS2> extends CFunctor2<T>, CFoldable2<T> {
  readonly traverse: CTraverse2<T>
  readonly sequence: CSequence2<T>
}

export interface CTraversable2C<T extends URIS2, TL>
  extends CFunctor2C<T, TL>,
    CFoldable2C<T, TL> {
  readonly traverse: CTraverse2C<T, TL>
  readonly sequence: CSequence2C<T, TL>
}

export interface CTraversable3<T extends URIS3> extends CFunctor3<T>, CFoldable3<T> {
  readonly traverse: CTraverse3<T>
  readonly sequence: CSequence3<T>
}

export interface CTraverse<T> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: HKT<T, A>) => Kind4<F, unknown, R, E, HKT<T, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: HKT<T, A>) => Kind4<F, unknown, R, E, HKT<T, B>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: HKT<T, A>) => Kind4<F, S, R, E, HKT<T, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: HKT<T, A>) => Kind4<F, S, R, E, HKT<T, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: HKT<T, A>) => Kind4<F, S, R, E, HKT<T, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (ta: HKT<T, A>) => Kind3<F, R, E, HKT<T, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (ta: HKT<T, A>) => Kind3<F, R, E, HKT<T, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (ta: HKT<T, A>) => Kind2<F, E, HKT<T, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (ta: HKT<T, A>) => Kind2<F, E, HKT<T, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, B>
  ) => (ta: HKT<T, A>) => Kind<F, HKT<T, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, B>
  ) => (ta: HKT<T, A>) => HKT<F, HKT<T, B>>
}

export interface CTraverse1<T extends URIS> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (ta: Kind<T, A>) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (ta: Kind<T, A>) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (ta: Kind<T, A>) => Kind2<F, E, Kind<T, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (ta: Kind<T, A>) => Kind2<F, E, Kind<T, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, B>
  ) => (ta: Kind<T, A>) => Kind<F, Kind<T, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, B>
  ) => (ta: Kind<T, A>) => HKT<F, Kind<T, B>>
}

export interface Traverse1<T extends URIS> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B>(
    ta: Kind<T, A>,
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B>(
    ta: Kind<T, A>,
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B>(
    ta: Kind<T, A>,
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B>(
    ta: Kind<T, A>,
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B>(
    ta: Kind<T, A>,
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B>(
    ta: Kind<T, A>,
    f: (a: A) => Kind3<F, R, E, B>
  ) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B>(
    ta: Kind<T, A>,
    f: (a: A) => Kind3<F, R, E, B>
  ) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B>(
    ta: Kind<T, A>,
    f: (a: A) => Kind2<F, E, B>
  ) => Kind2<F, E, Kind<T, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B>(
    ta: Kind<T, A>,
    f: (a: A) => Kind2<F, E, B>
  ) => Kind2<F, E, Kind<T, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    ta: Kind<T, A>,
    f: (a: A) => Kind<F, B>
  ) => Kind<F, Kind<T, B>>
  <F>(F: CApplicative<F>): <A, B>(
    ta: Kind<T, A>,
    f: (a: A) => HKT<F, B>
  ) => HKT<F, Kind<T, B>>
}

export interface CTraverse2<T extends URIS2> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, unknown, R, FE, Kind2<T, TE, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, unknown, R, FE, Kind2<T, TE, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B>(
    f: (a: A) => Kind3<F, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind3<F, R, FE, Kind2<T, TE, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    f: (a: A) => Kind2<F, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind2<F, FE, Kind2<T, TE, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    f: (a: A) => Kind2<F, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind2<F, FE, Kind2<T, TE, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind<F, Kind2<T, TE, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => HKT<F, Kind2<T, TE, B>>
}

export interface Traverse2<T extends URIS2> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B, TE>(
    ta: Kind2<T, TE, A>,
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, unknown, R, FE, Kind2<T, TE, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B, TE>(
    ta: Kind2<T, TE, A>,
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, unknown, R, FE, Kind2<T, TE, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B, TE>(
    ta: Kind2<T, TE, A>,
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B, TE>(
    ta: Kind2<T, TE, A>,
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B, TE>(
    ta: Kind2<T, TE, A>,
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B, TE>(
    ta: Kind2<T, TE, A>,
    f: (a: A) => Kind3<F, R, FE, B>
  ) => Kind3<F, R, FE, Kind2<T, TE, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B, TE>(
    ta: Kind2<T, TE, A>,
    f: (a: A) => Kind2<F, FE, B>
  ) => Kind2<F, FE, Kind2<T, TE, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B, TE>(
    ta: Kind2<T, TE, A>,
    f: (a: A) => Kind2<F, FE, B>
  ) => Kind2<F, FE, Kind2<T, TE, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B, TE>(
    ta: Kind2<T, TE, A>,
    f: (a: A) => Kind<F, B>
  ) => Kind<F, Kind2<T, TE, B>>
  <F>(F: CApplicative<F>): <A, B, TE>(
    ta: Kind2<T, TE, A>,
    f: (a: A) => HKT<F, B>
  ) => HKT<F, Kind2<T, TE, B>>
}

export interface CTraverse2C<T extends URIS2, E> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind4<F, unknown, R, FE, Kind2<T, E, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind4<F, unknown, R, FE, Kind2<T, E, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B>(
    f: (a: A) => Kind3<F, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind3<F, R, FE, Kind2<T, E, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    f: (a: A) => Kind2<F, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind2<F, FE, Kind2<T, E, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    f: (a: A) => Kind2<F, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind2<F, FE, Kind2<T, E, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, B>
  ) => (ta: Kind2<T, E, A>) => Kind<F, Kind2<T, E, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, B>
  ) => (ta: Kind2<T, E, A>) => HKT<F, Kind2<T, E, B>>
}

export interface Traverse2C<T extends URIS2, E> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B>(
    ta: Kind2<T, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, unknown, R, FE, Kind2<T, E, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B>(
    ta: Kind2<T, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, unknown, R, FE, Kind2<T, E, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B>(
    ta: Kind2<T, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B>(
    ta: Kind2<T, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B>(
    ta: Kind2<T, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B>(
    ta: Kind2<T, E, A>,
    f: (a: A) => Kind3<F, R, FE, B>
  ) => Kind3<F, R, FE, Kind2<T, E, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    ta: Kind2<T, E, A>,
    f: (a: A) => Kind2<F, FE, B>
  ) => Kind2<F, FE, Kind2<T, E, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    ta: Kind2<T, E, A>,
    f: (a: A) => Kind2<F, FE, B>
  ) => Kind2<F, FE, Kind2<T, E, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    ta: Kind2<T, E, A>,
    f: (a: A) => Kind<F, B>
  ) => Kind<F, Kind2<T, E, B>>
  <F>(F: CApplicative<F>): <A, B>(
    ta: Kind2<T, E, A>,
    f: (a: A) => HKT<F, B>
  ) => HKT<F, Kind2<T, E, B>>
}

export interface CTraverse3<T extends URIS3> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, FS, FR, B>(
    f: (a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(
    ta: Kind3<T, TR, TE, A>
  ) => Kind4<F, unknown, FR, FE, Kind3<T, TR, TE, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, FS, FR, FE, B>(
    f: (a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(
    ta: Kind3<T, TR, TE, A>
  ) => Kind4<F, unknown, FR, FE, Kind3<T, TR, TE, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, FS, FR, B>(
    f: (a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind4<F, FS, FR, FE, Kind3<T, TR, TE, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, FS, FR, FE, B>(
    f: (a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind4<F, FS, FR, FE, Kind3<T, TR, TE, B>>
  <F extends MaURIS>(F: CApplicative4<F>): <A, FS, FR, FE, B>(
    f: (a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind4<F, FS, FR, FE, Kind3<T, TR, TE, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, FS, FR, FE, B>(
    f: (a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind4<F, FS, FR, FE, Kind3<T, TR, TE, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, FR, FE, B>(
    f: (a: A) => Kind3<F, FR, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind3<F, FR, FE, Kind3<T, TR, TE, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    f: (a: A) => Kind2<F, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind2<F, FE, Kind3<T, TR, TE, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    f: (a: A) => Kind2<F, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind2<F, FE, Kind3<T, TR, TE, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind<F, Kind3<T, TR, TE, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => HKT<F, Kind3<T, TR, TE, B>>
}

export interface CSequence<T> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <S, R, A>(
    ta: HKT<T, Kind4<F, S, R, E, A>>
  ) => Kind4<F, unknown, R, E, HKT<T, A>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <S, R, A>(
    ta: HKT<T, Kind4<F, S, R, E, A>>
  ) => Kind4<F, S, R, E, HKT<T, A>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <S, R, E, A>(
    ta: HKT<T, Kind4<F, S, R, E, A>>
  ) => Kind4<F, unknown, R, E, HKT<T, A>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <S, R, E, A>(
    ta: HKT<T, Kind4<F, S, R, E, A>>
  ) => Kind4<F, S, R, E, HKT<T, A>>
  <F extends URIS4>(F: CApplicative4<F>): <S, R, E, A>(
    ta: HKT<T, Kind4<F, S, R, E, A>>
  ) => Kind4<F, S, R, E, HKT<T, A>>
  <F extends URIS3>(F: CApplicative3<F>): <R, E, A>(
    ta: HKT<T, Kind3<F, R, E, A>>
  ) => Kind3<F, R, E, HKT<T, A>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <R, A>(
    ta: HKT<T, Kind3<F, R, E, A>>
  ) => Kind3<F, R, E, HKT<T, A>>
  <F extends URIS2>(F: CApplicative2<F>): <E, A>(
    ta: HKT<T, Kind2<F, E, A>>
  ) => Kind2<F, E, HKT<T, A>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A>(
    ta: HKT<T, Kind2<F, E, A>>
  ) => Kind2<F, E, HKT<T, A>>
  <F extends URIS>(F: CApplicative1<F>): <A>(
    ta: HKT<T, Kind<F, A>>
  ) => Kind<F, HKT<T, A>>
  <F>(F: CApplicative<F>): <A>(ta: HKT<T, HKT<F, A>>) => HKT<F, HKT<T, A>>
}

export interface CSequence1<T extends URIS> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <S, R, A>(
    ta: Kind<T, Kind4<F, S, R, E, A>>
  ) => Kind4<F, unknown, R, E, Kind<T, A>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <S, R, E, A>(
    ta: Kind<T, Kind4<F, S, R, E, A>>
  ) => Kind4<F, unknown, R, E, Kind<T, A>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <S, R, A>(
    ta: Kind<T, Kind4<F, S, R, E, A>>
  ) => Kind4<F, S, R, E, Kind<T, A>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <S, R, E, A>(
    ta: Kind<T, Kind4<F, S, R, E, A>>
  ) => Kind4<F, S, R, E, Kind<T, A>>
  <F extends URIS4>(F: CApplicative4<F>): <S, R, E, A>(
    ta: Kind<T, Kind4<F, S, R, E, A>>
  ) => Kind4<F, S, R, E, Kind<T, A>>
  <F extends URIS3>(F: CApplicative3<F>): <R, E, A>(
    ta: Kind<T, Kind3<F, R, E, A>>
  ) => Kind3<F, R, E, Kind<T, A>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <R, A>(
    ta: Kind<T, Kind3<F, R, E, A>>
  ) => Kind3<F, R, E, Kind<T, A>>
  <F extends URIS2>(F: CApplicative2<F>): <E, A>(
    ta: Kind<T, Kind2<F, E, A>>
  ) => Kind2<F, E, Kind<T, A>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A>(
    ta: Kind<T, Kind2<F, E, A>>
  ) => Kind2<F, E, Kind<T, A>>
  <F extends URIS>(F: CApplicative1<F>): <A>(
    ta: Kind<T, Kind<F, A>>
  ) => Kind<F, Kind<T, A>>
  <F>(F: CApplicative<F>): <A>(ta: Kind<T, HKT<F, A>>) => HKT<F, Kind<T, A>>
}

export interface CSequence2<T extends URIS2> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <TE, S, R, A>(
    ta: Kind2<T, TE, Kind4<F, S, R, FE, A>>
  ) => Kind4<F, unknown, R, FE, Kind2<T, TE, A>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <TE, S, R, FE, A>(
    ta: Kind2<T, TE, Kind4<F, S, R, FE, A>>
  ) => Kind4<F, unknown, R, FE, Kind2<T, TE, A>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <TE, S, R, A>(
    ta: Kind2<T, TE, Kind4<F, S, R, FE, A>>
  ) => Kind4<F, S, R, FE, Kind2<T, TE, A>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <TE, S, R, FE, A>(
    ta: Kind2<T, TE, Kind4<F, S, R, FE, A>>
  ) => Kind4<F, S, R, FE, Kind2<T, TE, A>>
  <F extends URIS4>(F: CApplicative4<F>): <TE, S, R, FE, A>(
    ta: Kind2<T, TE, Kind4<F, S, R, FE, A>>
  ) => Kind4<F, S, R, FE, Kind2<T, TE, A>>
  <F extends URIS3>(F: CApplicative3<F>): <TE, R, FE, A>(
    ta: Kind2<T, TE, Kind3<F, R, FE, A>>
  ) => Kind3<F, R, FE, Kind2<T, TE, A>>
  <F extends URIS2>(F: CApplicative2<F>): <TE, FE, A>(
    ta: Kind2<T, TE, Kind2<F, FE, A>>
  ) => Kind2<F, FE, Kind2<T, TE, A>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <TE, A>(
    ta: Kind2<T, TE, Kind2<F, FE, A>>
  ) => Kind2<F, FE, Kind2<T, TE, A>>
  <F extends URIS>(F: CApplicative1<F>): <E, A>(
    ta: Kind2<T, E, Kind<F, A>>
  ) => Kind<F, Kind2<T, E, A>>
  <F>(F: CApplicative<F>): <E, A>(ta: Kind2<T, E, HKT<F, A>>) => HKT<F, Kind2<T, E, A>>
}

export interface CSequence2C<T extends URIS2, E> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <S, R, A>(
    ta: Kind2<T, E, Kind4<F, S, R, FE, A>>
  ) => Kind4<F, unknown, R, FE, Kind2<T, E, A>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <S, R, FE, A>(
    ta: Kind2<T, E, Kind4<F, S, R, FE, A>>
  ) => Kind4<F, unknown, R, FE, Kind2<T, E, A>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <S, R, A>(
    ta: Kind2<T, E, Kind4<F, S, R, FE, A>>
  ) => Kind4<F, S, R, FE, Kind2<T, E, A>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <S, R, FE, A>(
    ta: Kind2<T, E, Kind4<F, S, R, FE, A>>
  ) => Kind4<F, S, R, FE, Kind2<T, E, A>>
  <F extends URIS4>(F: CApplicative4<F>): <S, R, FE, A>(
    ta: Kind2<T, E, Kind4<F, S, R, FE, A>>
  ) => Kind4<F, S, R, FE, Kind2<T, E, A>>
  <F extends URIS3>(F: CApplicative3<F>): <R, FE, A>(
    ta: Kind2<T, E, Kind3<F, R, FE, A>>
  ) => Kind3<F, R, FE, Kind2<T, E, A>>
  <F extends URIS2>(F: CApplicative2<F>): <FE, A>(
    ta: Kind2<T, E, Kind2<F, FE, A>>
  ) => Kind2<F, FE, Kind2<T, E, A>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A>(
    ta: Kind2<T, E, Kind2<F, FE, A>>
  ) => Kind2<F, FE, Kind2<T, E, A>>
  <F extends URIS>(F: CApplicative1<F>): <A>(
    ta: Kind2<T, E, Kind<F, A>>
  ) => Kind<F, Kind2<T, E, A>>
  <F>(F: CApplicative<F>): <A>(ta: Kind2<T, E, HKT<F, A>>) => HKT<F, Kind2<T, E, A>>
}

export interface CSequence3<T extends URIS3> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <S, TR, TE, FR, A>(
    ta: Kind3<T, TR, TE, Kind4<F, S, FR, FE, A>>
  ) => Kind4<F, unknown, FR, FE, Kind3<T, TR, TE, A>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <S, TR, TE, FR, FE, A>(
    ta: Kind3<T, TR, TE, Kind4<F, S, FR, FE, A>>
  ) => Kind4<F, unknown, FR, FE, Kind3<T, TR, TE, A>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <S, TR, TE, FR, A>(
    ta: Kind3<T, TR, TE, Kind4<F, S, FR, FE, A>>
  ) => Kind4<F, S, FR, FE, Kind3<T, TR, TE, A>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <S, TR, TE, FR, FE, A>(
    ta: Kind3<T, TR, TE, Kind4<F, S, FR, FE, A>>
  ) => Kind4<F, S, FR, FE, Kind3<T, TR, TE, A>>
  <F extends URIS4>(F: CApplicative4<F>): <S, TR, TE, FR, FE, A>(
    ta: Kind3<T, TR, TE, Kind4<F, S, FR, FE, A>>
  ) => Kind4<F, S, FR, FE, Kind3<T, TR, TE, A>>
  <F extends URIS3>(F: CApplicative3<F>): <TR, TE, FR, FE, A>(
    ta: Kind3<T, TR, TE, Kind3<F, FR, FE, A>>
  ) => Kind3<F, FR, FE, Kind3<T, TR, TE, A>>
  <F extends URIS2>(F: CApplicative2<F>): <R, TE, FE, A>(
    ta: Kind3<T, R, TE, Kind2<F, FE, A>>
  ) => Kind2<F, FE, Kind3<T, R, TE, A>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <R, TE, A>(
    ta: Kind3<T, R, TE, Kind2<F, FE, A>>
  ) => Kind2<F, FE, Kind3<T, R, TE, A>>
  <F extends URIS>(F: CApplicative1<F>): <R, E, A>(
    ta: Kind3<T, R, E, Kind<F, A>>
  ) => Kind<F, Kind3<T, R, E, A>>
  <F>(F: CApplicative<F>): <R, E, A>(
    ta: Kind3<T, R, E, HKT<F, A>>
  ) => HKT<F, Kind3<T, R, E, A>>
}
