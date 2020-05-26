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
import {
  CFoldableWithIndex1,
  CFoldableWithIndex,
  CFoldableWithIndex2,
  CFoldableWithIndex2C,
  CFoldableWithIndex3
} from "../FoldableWithIndex"
import {
  CFunctorWithIndex,
  CFunctorWithIndex1,
  CFunctorWithIndex2,
  CFunctorWithIndex2C,
  CFunctorWithIndex3
} from "../FunctorWithIndex"
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
import {
  CTraversable,
  CTraversable1,
  CTraversable2,
  CTraversable2C,
  CTraversable3
} from "../Traversable"

export interface CTraversableWithIndex<T, I>
  extends CFunctorWithIndex<T, I>,
    CFoldableWithIndex<T, I>,
    CTraversable<T> {
  readonly traverseWithIndex: CTraverseWithIndex<T, I>
}

export interface CTraversableWithIndex1<T extends URIS, I>
  extends CFunctorWithIndex1<T, I>,
    CFoldableWithIndex1<T, I>,
    CTraversable1<T> {
  readonly traverseWithIndex: CTraverseWithIndex1<T, I>
}

export interface CTraversableWithIndex2<T extends URIS2, I>
  extends CFunctorWithIndex2<T, I>,
    CFoldableWithIndex2<T, I>,
    CTraversable2<T> {
  readonly traverseWithIndex: CTraverseWithIndex2<T, I>
}

export interface CTraversableWithIndex2C<T extends URIS2, I, TL>
  extends CFunctorWithIndex2C<T, I, TL>,
    CFoldableWithIndex2C<T, I, TL>,
    CTraversable2C<T, TL> {
  readonly traverseWithIndex: CTraverseWithIndex2C<T, I, TL>
}

export interface CTraversableWithIndex3<T extends URIS3, I>
  extends CFunctorWithIndex3<T, I>,
    CFoldableWithIndex3<T, I>,
    CTraversable3<T> {
  readonly traverseWithIndex: CTraverseWithIndex3<T, I>
}

export interface CTraverseWithIndex<T, I> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: HKT<T, A>) => Kind4<F, unknown, R, E, HKT<T, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: HKT<T, A>) => Kind4<F, unknown, R, E, HKT<T, B>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: HKT<T, A>) => Kind4<F, S, R, E, HKT<T, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: HKT<T, A>) => Kind4<F, S, R, E, HKT<T, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: HKT<T, A>) => Kind4<F, S, R, E, HKT<T, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B>(
    f: (i: I, a: A) => Kind3<F, R, E, B>
  ) => (ta: HKT<T, A>) => Kind3<F, R, E, HKT<T, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B>(
    f: (i: I, a: A) => Kind3<F, R, E, B>
  ) => (ta: HKT<T, A>) => Kind3<F, R, E, HKT<T, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B>(
    f: (i: I, a: A) => Kind2<F, E, B>
  ) => (ta: HKT<T, A>) => Kind2<F, E, HKT<T, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B>(
    f: (i: I, a: A) => Kind2<F, E, B>
  ) => (ta: HKT<T, A>) => Kind2<F, E, HKT<T, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (i: I, a: A) => Kind<F, B>
  ) => (ta: HKT<T, A>) => Kind<F, HKT<T, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (i: I, a: A) => HKT<F, B>
  ) => (ta: HKT<T, A>) => HKT<F, HKT<T, B>>
}

export interface CTraverseWithIndex1<T extends URIS, I> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B>(
    f: (i: I, a: A) => Kind3<F, R, E, B>
  ) => (ta: Kind<T, A>) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B>(
    f: (i: I, a: A) => Kind3<F, R, E, B>
  ) => (ta: Kind<T, A>) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B>(
    f: (i: I, a: A) => Kind2<F, E, B>
  ) => (ta: Kind<T, A>) => Kind2<F, E, Kind<T, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B>(
    f: (i: I, a: A) => Kind2<F, E, B>
  ) => (ta: Kind<T, A>) => Kind2<F, E, Kind<T, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (i: I, a: A) => Kind<F, B>
  ) => (ta: Kind<T, A>) => Kind<F, Kind<T, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (i: I, a: A) => HKT<F, B>
  ) => (ta: Kind<T, A>) => HKT<F, Kind<T, B>>
}

export interface TraverseWithIndex1<T extends URIS, I> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B>(
    ta: Kind<T, A>,
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B>(
    ta: Kind<T, A>,
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B>(
    ta: Kind<T, A>,
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B>(
    ta: Kind<T, A>,
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B>(
    ta: Kind<T, A>,
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B>(
    ta: Kind<T, A>,
    f: (i: I, a: A) => Kind3<F, R, E, B>
  ) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B>(
    ta: Kind<T, A>,
    f: (i: I, a: A) => Kind3<F, R, E, B>
  ) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B>(
    ta: Kind<T, A>,
    f: (i: I, a: A) => Kind2<F, E, B>
  ) => Kind2<F, E, Kind<T, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B>(
    ta: Kind<T, A>,
    f: (i: I, a: A) => Kind2<F, E, B>
  ) => Kind2<F, E, Kind<T, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    ta: Kind<T, A>,
    f: (i: I, a: A) => Kind<F, B>
  ) => Kind<F, Kind<T, B>>
  <F>(F: CApplicative<F>): <A, B>(
    ta: Kind<T, A>,
    f: (i: I, a: A) => HKT<F, B>
  ) => HKT<F, Kind<T, B>>
}

export interface CTraverseWithIndex2<T extends URIS2, I> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, unknown, R, FE, Kind2<T, TE, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B>(
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, unknown, R, FE, Kind2<T, TE, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B>(
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B>(
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B>(
    f: (i: I, a: A) => Kind3<F, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind3<F, R, FE, Kind2<T, TE, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    f: (i: I, a: A) => Kind2<F, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind2<F, FE, Kind2<T, TE, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    f: (i: I, a: A) => Kind2<F, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind2<F, FE, Kind2<T, TE, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (i: I, a: A) => Kind<F, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind<F, Kind2<T, TE, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (i: I, a: A) => HKT<F, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => HKT<F, Kind2<T, TE, B>>
}

export interface CTraverseWithIndex2C<T extends URIS2, I, E> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind4<F, unknown, R, FE, Kind2<T, E, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B>(
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind4<F, unknown, R, FE, Kind2<T, E, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B>(
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B>(
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B>(
    f: (i: I, a: A) => Kind3<F, R, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind3<F, R, FE, Kind2<T, E, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    f: (i: I, a: A) => Kind2<F, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind2<F, FE, Kind2<T, E, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    f: (i: I, a: A) => Kind2<F, FE, B>
  ) => (ta: Kind2<T, E, A>) => Kind2<F, FE, Kind2<T, E, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (i: I, a: A) => Kind<F, B>
  ) => (ta: Kind2<T, E, A>) => Kind<F, Kind2<T, E, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (i: I, a: A) => HKT<F, B>
  ) => (ta: Kind2<T, E, A>) => HKT<F, Kind2<T, E, B>>
}

export interface TraverseWithIndex2C<T extends URIS2, I, E> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B>(
    ta: Kind2<T, E, A>,
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, unknown, R, FE, Kind2<T, E, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B>(
    ta: Kind2<T, E, A>,
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, unknown, R, FE, Kind2<T, E, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B>(
    ta: Kind2<T, E, A>,
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B>(
    ta: Kind2<T, E, A>,
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B>(
    ta: Kind2<T, E, A>,
    f: (i: I, a: A) => Kind4<F, S, R, FE, B>
  ) => Kind4<F, S, R, FE, Kind2<T, E, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B>(
    ta: Kind2<T, E, A>,
    f: (i: I, a: A) => Kind3<F, R, FE, B>
  ) => Kind3<F, R, FE, Kind2<T, E, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    ta: Kind2<T, E, A>,
    f: (i: I, a: A) => Kind2<F, FE, B>
  ) => Kind2<F, FE, Kind2<T, E, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    ta: Kind2<T, E, A>,
    f: (i: I, a: A) => Kind2<F, FE, B>
  ) => Kind2<F, FE, Kind2<T, E, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    ta: Kind2<T, E, A>,
    f: (i: I, a: A) => Kind<F, B>
  ) => Kind<F, Kind2<T, E, B>>
  <F>(F: CApplicative<F>): <A, B>(
    ta: Kind2<T, E, A>,
    f: (i: I, a: A) => HKT<F, B>
  ) => HKT<F, Kind2<T, E, B>>
}

export interface CTraverseWithIndex3<T extends URIS3, I> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, FS, FR, B>(
    f: (i: I, a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(
    ta: Kind3<T, TR, TE, A>
  ) => Kind4<F, unknown, FR, FE, Kind3<T, TR, TE, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, FS, FR, FE, B>(
    f: (i: I, a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(
    ta: Kind3<T, TR, TE, A>
  ) => Kind4<F, unknown, FR, FE, Kind3<T, TR, TE, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, FS, FR, B>(
    f: (i: I, a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind4<F, FS, FR, FE, Kind3<T, TR, TE, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, FS, FR, FE, B>(
    f: (i: I, a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind4<F, FS, FR, FE, Kind3<T, TR, TE, B>>
  <F extends MaURIS>(F: CApplicative4<F>): <A, FS, FR, FE, B>(
    f: (i: I, a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind4<F, FS, FR, FE, Kind3<T, TR, TE, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, FS, FR, FE, B>(
    f: (i: I, a: A) => Kind4<F, FS, FR, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind4<F, FS, FR, FE, Kind3<T, TR, TE, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, FR, FE, B>(
    f: (i: I, a: A) => Kind3<F, FR, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind3<F, FR, FE, Kind3<T, TR, TE, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    f: (i: I, a: A) => Kind2<F, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind2<F, FE, Kind3<T, TR, TE, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    f: (i: I, a: A) => Kind2<F, FE, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind2<F, FE, Kind3<T, TR, TE, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (i: I, a: A) => Kind<F, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => Kind<F, Kind3<T, TR, TE, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (i: I, a: A) => HKT<F, B>
  ) => <TR, TE>(ta: Kind3<T, TR, TE, A>) => HKT<F, Kind3<T, TR, TE, B>>
}
