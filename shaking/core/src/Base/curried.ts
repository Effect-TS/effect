import type {
  Applicative,
  Applicative1,
  Applicative2,
  Applicative2C,
  Applicative3,
  Applicative3C
} from "fp-ts/lib/Applicative"
import type { Filterable2C } from "fp-ts/lib/Filterable"
import type { Foldable2C } from "fp-ts/lib/Foldable"
import type { FoldableWithIndex2C } from "fp-ts/lib/FoldableWithIndex"
import type { Functor2C } from "fp-ts/lib/Functor"
import type { FunctorWithIndex2C } from "fp-ts/lib/FunctorWithIndex"
import type { HKT, Kind, Kind2, Kind3, Kind4, URIS, URIS2, URIS3 } from "fp-ts/lib/HKT"
import type { Option } from "fp-ts/lib/Option"
import type { Sequence2C, Traverse2C } from "fp-ts/lib/Traversable"
import type { TraverseWithIndex2C } from "fp-ts/lib/TraversableWithIndex"
import type { Wilt2C, Wither2C } from "fp-ts/lib/Witherable"

import type {
  Applicative4E,
  Applicative4EC,
  Applicative4ECP,
  Applicative4EP,
  MaURIS
} from "../Support/Overloads"

export interface TraverseCurried1<T extends URIS> {
  <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS, E>(F: Applicative4EC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends URIS3>(F: Applicative3<F>): <A, R, E, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (ta: Kind<T, A>) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS3, E>(F: Applicative3C<F, E>): <A, R, B>(
    f: (a: A) => Kind3<F, R, E, B>
  ) => (ta: Kind<T, A>) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS2>(F: Applicative2<F>): <A, E, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (ta: Kind<T, A>) => Kind2<F, E, Kind<T, B>>
  <F extends URIS2, E>(F: Applicative2C<F, E>): <A, B>(
    f: (a: A) => Kind2<F, E, B>
  ) => (ta: Kind<T, A>) => Kind2<F, E, Kind<T, B>>
  <F extends URIS>(F: Applicative1<F>): <A, B>(
    f: (a: A) => Kind<F, B>
  ) => (ta: Kind<T, A>) => Kind<F, Kind<T, B>>
  <F>(F: Applicative<F>): <A, B>(
    f: (a: A) => HKT<F, B>
  ) => (ta: Kind<T, A>) => HKT<F, Kind<T, B>>
}

export interface TraverseCurried2<T extends URIS2> {
  <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, unknown, R, E, Kind2<T, TE, B>>
  <F extends MaURIS, E>(F: Applicative4EC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, S, R, E, Kind2<T, TE, B>>
  <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, unknown, R, FE, Kind2<T, TE, B>>
  <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  <F extends URIS3>(F: Applicative3<F>): <A, R, FE, B>(
    f: (a: A) => Kind3<F, R, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind3<F, R, FE, Kind2<T, TE, B>>
  <F extends URIS2>(F: Applicative2<F>): <A, FE, B>(
    f: (a: A) => Kind2<F, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind2<F, FE, Kind2<T, TE, B>>
  <F extends URIS2, FE>(F: Applicative2C<F, FE>): <A, B>(
    f: (a: A) => Kind2<F, FE, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind2<F, FE, Kind2<T, TE, B>>
  <F extends URIS>(F: Applicative1<F>): <A, B>(
    f: (a: A) => Kind<F, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => Kind<F, Kind2<T, TE, B>>
  <F>(F: Applicative<F>): <A, B>(
    f: (a: A) => HKT<F, B>
  ) => <TE>(ta: Kind2<T, TE, A>) => HKT<F, Kind2<T, TE, B>>
}

export interface TraverseWithIndexCurried1<T extends URIS, I> {
  <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS, E>(F: Applicative4EC<F, E>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, E, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, unknown, R, E, Kind<T, B>>
  <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, E, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind<T, A>) => Kind4<F, S, R, E, Kind<T, B>>
  <F extends URIS3>(F: Applicative3<F>): <A, R, E, B>(
    f: (i: I, a: A) => Kind3<F, R, E, B>
  ) => (ta: Kind<T, A>) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS3, E>(F: Applicative3C<F, E>): <A, R, B>(
    f: (i: I, a: A) => Kind3<F, R, E, B>
  ) => (ta: Kind<T, A>) => Kind3<F, R, E, Kind<T, B>>
  <F extends URIS2>(F: Applicative2<F>): <A, E, B>(
    f: (i: I, a: A) => Kind2<F, E, B>
  ) => (ta: Kind<T, A>) => Kind2<F, E, Kind<T, B>>
  <F extends URIS2, E>(F: Applicative2C<F, E>): <A, B>(
    f: (i: I, a: A) => Kind2<F, E, B>
  ) => (ta: Kind<T, A>) => Kind2<F, E, Kind<T, B>>
  <F extends URIS>(F: Applicative1<F>): <A, B>(
    f: (i: I, a: A) => Kind<F, B>
  ) => (ta: Kind<T, A>) => Kind<F, Kind<T, B>>
  <F>(F: Applicative<F>): <A, B>(
    f: (i: I, a: A) => HKT<F, B>
  ) => (ta: Kind<T, A>) => HKT<F, Kind<T, B>>
}

export interface WitherCurried1<W extends URIS> {
  <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind4<F, unknown, R, E, Kind<W, B>>
  <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind4<F, unknown, R, E, Kind<W, B>>
  <F extends MaURIS, E>(F: Applicative4EC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind4<F, S, R, E, Kind<W, B>>
  <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind4<F, S, R, E, Kind<W, B>>
  <F extends URIS3>(F: Applicative3<F>): <A, R, E, B>(
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind3<F, R, E, Kind<W, B>>
  <F extends URIS3, E>(F: Applicative3C<F, E>): <A, R, B>(
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind3<F, R, E, Kind<W, B>>
  <F extends URIS2>(F: Applicative2<F>): <A, E, B>(
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind2<F, E, Kind<W, B>>
  <F extends URIS2, E>(F: Applicative2C<F, E>): <A, B>(
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind2<F, E, Kind<W, B>>
  <F extends URIS>(F: Applicative1<F>): <A, B>(
    f: (a: A) => Kind<F, Option<B>>
  ) => (ta: Kind<W, A>) => Kind<F, Kind<W, B>>
  <F>(F: Applicative<F>): <A, B>(
    f: (a: A) => HKT<F, Option<B>>
  ) => (ta: Kind<W, A>) => HKT<F, Kind<W, B>>
}

export interface TraverseCurried2C<T extends URIS2, TE> {
  <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind2<T, TE, A>) => Kind4<F, unknown, R, E, Kind2<T, TE, B>>
  <F extends MaURIS, E>(F: Applicative4EC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind2<T, TE, A>) => Kind4<F, S, R, E, Kind2<T, TE, B>>
  <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, TE, A>) => Kind4<F, unknown, R, FE, Kind2<T, TE, B>>
  <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, B>
  ) => (ta: Kind2<T, TE, A>) => Kind4<F, S, R, FE, Kind2<T, TE, B>>
  <F extends URIS3>(F: Applicative3<F>): <A, R, FE, B>(
    f: (a: A) => Kind3<F, R, FE, B>
  ) => (ta: Kind2<T, TE, A>) => Kind3<F, R, FE, Kind2<T, TE, B>>
  <F extends URIS2>(F: Applicative2<F>): <A, FE, B>(
    f: (a: A) => Kind2<F, FE, B>
  ) => (ta: Kind2<T, TE, A>) => Kind2<F, FE, Kind2<T, TE, B>>
  <F extends URIS2, FE>(F: Applicative2C<F, FE>): <A, B>(
    f: (a: A) => Kind2<F, FE, B>
  ) => (ta: Kind2<T, TE, A>) => Kind2<F, FE, Kind2<T, TE, B>>
  <F extends URIS>(F: Applicative1<F>): <A, B>(
    f: (a: A) => Kind<F, B>
  ) => (ta: Kind2<T, TE, A>) => Kind<F, Kind2<T, TE, B>>
  <F>(F: Applicative<F>): <A, B>(
    f: (a: A) => HKT<F, B>
  ) => (ta: Kind2<T, TE, A>) => HKT<F, Kind2<T, TE, B>>
}

export interface TraversableCurried2C<T extends URIS2, TL>
  extends Functor2C<T, TL>,
    Foldable2C<T, TL> {
  readonly traverse: TraverseCurried2C<T, TL>
  readonly traverse_: Traverse2C<T, TL>
  readonly sequence: Sequence2C<T, TL>
}

export interface WitherCurried2C<W extends URIS2, TE> {
  <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind2<W, TE, A>) => Kind4<F, unknown, R, E, Kind2<W, TE, B>>
  <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind2<W, TE, A>) => Kind4<F, unknown, R, E, Kind2<W, TE, B>>
  <F extends MaURIS, E>(F: Applicative4EC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind2<W, TE, A>) => Kind4<F, S, R, E, Kind2<W, TE, B>>
  <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind2<W, TE, A>) => Kind4<F, S, R, E, Kind2<W, TE, B>>
  <F extends URIS3>(F: Applicative3<F>): <A, R, E, B>(
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => (ta: Kind2<W, TE, A>) => Kind3<F, R, E, Kind2<W, TE, B>>
  <F extends URIS3, E>(F: Applicative3C<F, E>): <A, R, B>(
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => (ta: Kind2<W, TE, A>) => Kind3<F, R, E, Kind2<W, TE, B>>
  <F extends URIS2>(F: Applicative2<F>): <A, E, B>(
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => (ta: Kind2<W, TE, A>) => Kind2<F, E, Kind2<W, TE, B>>
  <F extends URIS2, E>(F: Applicative2C<F, E>): <A, B>(
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => (ta: Kind2<W, TE, A>) => Kind2<F, E, Kind2<W, TE, B>>
  <F extends URIS>(F: Applicative1<F>): <A, B>(
    f: (a: A) => Kind<F, Option<B>>
  ) => (ta: Kind2<W, TE, A>) => Kind<F, Kind2<W, TE, B>>
  <F>(F: Applicative<F>): <A, B>(
    f: (a: A) => HKT<F, Option<B>>
  ) => (ta: Kind2<W, TE, A>) => HKT<F, Kind2<W, TE, B>>
}

export interface WitherableCurried2C<T extends URIS2, TL>
  extends TraversableCurried2C<T, TL>,
    Filterable2C<T, TL> {
  readonly wilt: Wilt2C<T, TL>
  readonly wither: WitherCurried2C<T, TL>
  readonly wither_: Wither2C<T, TL>
}

export interface TraverseWithIndexCurried2C<T extends URIS2, I, TE> {
  <F extends MaURIS, E>(F: Applicative4ECP<F, E>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind2<T, TE, A>) => Kind4<F, unknown, R, E, Kind2<T, TE, B>>
  <F extends MaURIS, E>(F: Applicative4EC<F, E>): <A, S, R, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind2<T, TE, A>) => Kind4<F, S, R, E, Kind2<T, TE, B>>
  <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, E, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind2<T, TE, A>) => Kind4<F, unknown, R, E, Kind2<T, TE, B>>
  <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, E, B>(
    f: (i: I, a: A) => Kind4<F, S, R, E, B>
  ) => (ta: Kind2<T, TE, A>) => Kind4<F, S, R, E, Kind2<T, TE, B>>
  <F extends URIS3>(F: Applicative3<F>): <A, R, E, B>(
    f: (i: I, a: A) => Kind3<F, R, E, B>
  ) => (ta: Kind2<T, TE, A>) => Kind3<F, R, E, Kind2<T, TE, B>>
  <F extends URIS3, E>(F: Applicative3C<F, E>): <A, R, B>(
    f: (i: I, a: A) => Kind3<F, R, E, B>
  ) => (ta: Kind2<T, TE, A>) => Kind3<F, R, E, Kind2<T, TE, B>>
  <F extends URIS2>(F: Applicative2<F>): <A, E, B>(
    f: (i: I, a: A) => Kind2<F, E, B>
  ) => (ta: Kind2<T, TE, A>) => Kind2<F, E, Kind2<T, TE, B>>
  <F extends URIS2, E>(F: Applicative2C<F, E>): <A, B>(
    f: (i: I, a: A) => Kind2<F, E, B>
  ) => (ta: Kind2<T, TE, A>) => Kind2<F, E, Kind2<T, TE, B>>
  <F extends URIS>(F: Applicative1<F>): <A, B>(
    f: (i: I, a: A) => Kind<F, B>
  ) => (ta: Kind2<T, TE, A>) => Kind<F, Kind2<T, TE, B>>
  <F>(F: Applicative<F>): <A, B>(
    f: (i: I, a: A) => HKT<F, B>
  ) => (ta: Kind2<T, TE, A>) => HKT<F, Kind2<T, TE, B>>
}

export interface TraversableWithIndexCurried2C<T extends URIS2, I, E>
  extends FunctorWithIndex2C<T, I, E>,
    FoldableWithIndex2C<T, I, E>,
    TraversableCurried2C<T, E> {
  readonly traverseWithIndex: TraverseWithIndexCurried2C<T, I, E>
  readonly traverseWithIndex_: TraverseWithIndex2C<T, I, E>
}

declare module "fp-ts/lib/Witherable" {
  export interface Wither2C<W extends URIS2, E> {
    <F extends MaURIS>(F: Applicative4EP<F>): <A, S, R, FE, B>(
      ta: Kind2<W, E, A>,
      f: (a: A) => Kind4<F, S, R, FE, Option<B>>
    ) => Kind4<F, unknown, R, FE, Kind2<W, E, B>>
    <F extends MaURIS>(F: Applicative4E<F>): <A, S, R, FE, B>(
      ta: Kind2<W, E, A>,
      f: (a: A) => Kind4<F, S, R, FE, Option<B>>
    ) => Kind4<F, S, R, FE, Kind2<W, E, B>>
    <F extends MaURIS, FE>(F: Applicative4ECP<F, FE>): <A, S, R, B>(
      ta: Kind2<W, E, A>,
      f: (a: A) => Kind4<F, S, R, FE, Option<B>>
    ) => Kind4<F, unknown, R, FE, Kind2<W, E, B>>
    <F extends MaURIS, FE>(F: Applicative4EC<F, FE>): <A, S, R, B>(
      ta: Kind2<W, E, A>,
      f: (a: A) => Kind4<F, S, R, FE, Option<B>>
    ) => Kind4<F, S, R, FE, Kind2<W, E, B>>
  }
}
