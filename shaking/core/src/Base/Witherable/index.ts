/* adapted from https://github.com/gcanti/fp-ts */

import type { Either } from "../../Either"
import type { Option } from "../../Option"
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
  CApplicative4MAPC,
  CApplicative4MAC
} from "../Applicative"
import type { Separated } from "../Compactable"
import {
  CFilterable,
  CFilterable1,
  CFilterable2,
  CFilterable2C,
  CFilterable3
} from "../Filterable"
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
import type {
  CTraversable,
  CTraversable1,
  CTraversable2,
  CTraversable2C,
  CTraversable3
} from "../Traversable"

export interface CWitherable<T> extends CTraversable<T>, CFilterable<T> {
  readonly wilt: CWilt<T>
  readonly wither: CWither<T>
}

export interface CWitherable1<T extends URIS>
  extends CTraversable1<T>,
    CFilterable1<T> {
  readonly wilt: CWilt1<T>
  readonly wither: CWither1<T>
}

export interface CWitherable2<T extends URIS2>
  extends CTraversable2<T>,
    CFilterable2<T> {
  readonly wilt: CWilt2<T>
  readonly wither: CWither2<T>
}

export interface CWitherable2C<T extends URIS2, TL>
  extends CTraversable2C<T, TL>,
    CFilterable2C<T, TL> {
  readonly wilt: CWilt2C<T, TL>
  readonly wither: CWither2C<T, TL>
}

export interface CWitherable3<T extends URIS3>
  extends CTraversable3<T>,
    CFilterable3<T> {
  readonly wilt: CWilt3<T>
  readonly wither: CWither3<T>
}

export interface CWither<W> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: HKT<W, A>) => Kind4<F, unknown, R, E, HKT<W, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: HKT<W, A>) => Kind4<F, unknown, R, E, HKT<W, B>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: HKT<W, A>) => Kind4<F, S, R, E, HKT<W, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: HKT<W, A>) => Kind4<F, S, R, E, HKT<W, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: HKT<W, A>) => Kind4<F, S, R, E, HKT<W, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B>(
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => (ta: HKT<W, A>) => Kind3<F, R, E, HKT<W, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B>(
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => (ta: HKT<W, A>) => Kind3<F, R, E, HKT<W, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B>(
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => (ta: HKT<W, A>) => Kind2<F, E, HKT<W, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B>(
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => (ta: HKT<W, A>) => Kind2<F, E, HKT<W, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, Option<B>>
  ) => (ta: HKT<W, A>) => Kind<F, HKT<W, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, Option<B>>
  ) => (ta: HKT<W, A>) => HKT<F, HKT<W, B>>
}

export interface CWither1<W extends URIS> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind4<F, unknown, R, E, Kind<W, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind4<F, unknown, R, E, Kind<W, B>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind4<F, S, R, E, Kind<W, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind4<F, S, R, E, Kind<W, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B>(
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind4<F, S, R, E, Kind<W, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B>(
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind3<F, R, E, Kind<W, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B>(
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind3<F, R, E, Kind<W, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B>(
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind2<F, E, Kind<W, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B>(
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => (ta: Kind<W, A>) => Kind2<F, E, Kind<W, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, Option<B>>
  ) => (ta: Kind<W, A>) => Kind<F, Kind<W, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, Option<B>>
  ) => (ta: Kind<W, A>) => HKT<F, Kind<W, B>>
}

export interface Wither1<W extends URIS> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B>(
    ta: Kind<W, A>,
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => Kind4<F, unknown, R, E, Kind<W, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B>(
    ta: Kind<W, A>,
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => Kind4<F, unknown, R, E, Kind<W, B>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B>(
    ta: Kind<W, A>,
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => Kind4<F, S, R, E, Kind<W, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B>(
    ta: Kind<W, A>,
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => Kind4<F, S, R, E, Kind<W, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B>(
    ta: Kind<W, A>,
    f: (a: A) => Kind4<F, S, R, E, Option<B>>
  ) => Kind4<F, S, R, E, Kind<W, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B>(
    ta: Kind<W, A>,
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => Kind3<F, R, E, Kind<W, B>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B>(
    ta: Kind<W, A>,
    f: (a: A) => Kind3<F, R, E, Option<B>>
  ) => Kind3<F, R, E, Kind<W, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B>(
    ta: Kind<W, A>,
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => Kind2<F, E, Kind<W, B>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B>(
    ta: Kind<W, A>,
    f: (a: A) => Kind2<F, E, Option<B>>
  ) => Kind2<F, E, Kind<W, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    ta: Kind<W, A>,
    f: (a: A) => Kind<F, Option<B>>
  ) => Kind<F, Kind<W, B>>
  <F>(F: CApplicative<F>): <A, B>(
    ta: Kind<W, A>,
    f: (a: A) => HKT<F, Option<B>>
  ) => HKT<F, Kind<W, B>>
}

export interface CWither2<W extends URIS2> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => <WE>(ta: Kind2<W, WE, A>) => Kind4<F, unknown, R, FE, Kind2<W, WE, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => <WE>(ta: Kind2<W, WE, A>) => Kind4<F, unknown, R, FE, Kind2<W, WE, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => <WE>(ta: Kind2<W, WE, A>) => Kind4<F, S, R, FE, Kind2<W, WE, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => <WE>(ta: Kind2<W, WE, A>) => Kind4<F, S, R, FE, Kind2<W, WE, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => <WE>(ta: Kind2<W, WE, A>) => Kind4<F, S, R, FE, Kind2<W, WE, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B>(
    f: (a: A) => Kind3<F, R, FE, Option<B>>
  ) => <WE>(ta: Kind2<W, WE, A>) => Kind3<F, R, FE, Kind2<W, WE, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    f: (a: A) => Kind2<F, FE, Option<B>>
  ) => <WE>(ta: Kind2<W, WE, A>) => Kind2<F, FE, Kind2<W, WE, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    f: (a: A) => Kind2<F, FE, Option<B>>
  ) => <WE>(ta: Kind2<W, WE, A>) => Kind2<F, FE, Kind2<W, WE, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, Option<B>>
  ) => <WE>(ta: Kind2<W, WE, A>) => Kind<F, Kind2<W, WE, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, Option<B>>
  ) => <WE>(ta: Kind2<W, WE, A>) => HKT<F, Kind2<W, WE, B>>
}

export interface CWither2C<W extends URIS2, E> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => (ta: Kind2<W, E, A>) => Kind4<F, unknown, R, FE, Kind2<W, E, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => (ta: Kind2<W, E, A>) => Kind4<F, unknown, R, FE, Kind2<W, E, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B>(
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => (ta: Kind2<W, E, A>) => Kind4<F, S, R, FE, Kind2<W, E, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => (ta: Kind2<W, E, A>) => Kind4<F, S, R, FE, Kind2<W, E, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B>(
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => (ta: Kind2<W, E, A>) => Kind4<F, S, R, FE, Kind2<W, E, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B>(
    f: (a: A) => Kind3<F, R, FE, Option<B>>
  ) => (ta: Kind2<W, E, A>) => Kind3<F, R, FE, Kind2<W, E, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    f: (a: A) => Kind2<F, FE, Option<B>>
  ) => (ta: Kind2<W, E, A>) => Kind2<F, FE, Kind2<W, E, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    f: (a: A) => Kind2<F, FE, Option<B>>
  ) => (ta: Kind2<W, E, A>) => Kind2<F, FE, Kind2<W, E, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, Option<B>>
  ) => (ta: Kind2<W, E, A>) => Kind<F, Kind2<W, E, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, Option<B>>
  ) => (ta: Kind2<W, E, A>) => HKT<F, Kind2<W, E, B>>
}

export interface Wither2C<W extends URIS2, E> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B>(
    ta: Kind2<W, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => Kind4<F, unknown, R, FE, Kind2<W, E, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B>(
    ta: Kind2<W, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => Kind4<F, unknown, R, FE, Kind2<W, E, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B>(
    ta: Kind2<W, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => Kind4<F, S, R, FE, Kind2<W, E, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B>(
    ta: Kind2<W, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => Kind4<F, S, R, FE, Kind2<W, E, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B>(
    ta: Kind2<W, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, Option<B>>
  ) => Kind4<F, S, R, FE, Kind2<W, E, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B>(
    ta: Kind2<W, E, A>,
    f: (a: A) => Kind3<F, R, FE, Option<B>>
  ) => Kind3<F, R, FE, Kind2<W, E, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    ta: Kind2<W, E, A>,
    f: (a: A) => Kind2<F, FE, Option<B>>
  ) => Kind2<F, FE, Kind2<W, E, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    ta: Kind2<W, E, A>,
    f: (a: A) => Kind2<F, FE, Option<B>>
  ) => Kind2<F, FE, Kind2<W, E, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    ta: Kind2<W, E, A>,
    f: (a: A) => Kind<F, Option<B>>
  ) => Kind<F, Kind2<W, E, B>>
  <F>(F: CApplicative<F>): <A, B>(
    ta: Kind2<W, E, A>,
    f: (a: A) => HKT<F, Option<B>>
  ) => HKT<F, Kind2<W, E, B>>
}

export interface CWither3<W extends URIS3> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, FR, B>(
    f: (a: A) => Kind4<F, S, FR, FE, Option<B>>
  ) => <WR, WE>(
    ta: Kind3<W, WR, WE, A>
  ) => Kind4<F, unknown, FR, FE, Kind3<W, WR, WE, B>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, FR, FE, B>(
    f: (a: A) => Kind4<F, S, FR, FE, Option<B>>
  ) => <WR, WE>(
    ta: Kind3<W, WR, WE, A>
  ) => Kind4<F, unknown, FR, FE, Kind3<W, WR, WE, B>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, FR, B>(
    f: (a: A) => Kind4<F, S, FR, FE, Option<B>>
  ) => <WR, WE>(ta: Kind3<W, WR, WE, A>) => Kind4<F, S, FR, FE, Kind3<W, WR, WE, B>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, FR, FE, B>(
    f: (a: A) => Kind4<F, S, FR, FE, Option<B>>
  ) => <WR, WE>(ta: Kind3<W, WR, WE, A>) => Kind4<F, S, FR, FE, Kind3<W, WR, WE, B>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, FR, FE, B>(
    f: (a: A) => Kind4<F, S, FR, FE, Option<B>>
  ) => <WR, WE>(ta: Kind3<W, WR, WE, A>) => Kind4<F, S, FR, FE, Kind3<W, WR, WE, B>>
  <F extends URIS3>(F: CApplicative3<F>): <A, FR, FE, B>(
    f: (a: A) => Kind3<F, FR, FE, Option<B>>
  ) => <WR, WE>(ta: Kind3<W, WR, WE, A>) => Kind3<F, FR, FE, Kind3<W, WR, WE, B>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B>(
    f: (a: A) => Kind2<F, FE, Option<B>>
  ) => <WR, WE>(ta: Kind3<W, WR, WE, A>) => Kind2<F, FE, Kind3<W, WR, WE, B>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B>(
    f: (a: A) => Kind2<F, FE, Option<B>>
  ) => <WR, WE>(ta: Kind3<W, WR, WE, A>) => Kind2<F, FE, Kind3<W, WR, WE, B>>
  <F extends URIS>(F: CApplicative1<F>): <A, B>(
    f: (a: A) => Kind<F, Option<B>>
  ) => <WR, WE>(ta: Kind3<W, WR, WE, A>) => Kind<F, Kind3<W, WR, WE, B>>
  <F>(F: CApplicative<F>): <A, B>(
    f: (a: A) => HKT<F, Option<B>>
  ) => <WR, WE>(ta: Kind3<W, WR, WE, A>) => HKT<F, Kind3<W, WR, WE, B>>
}

export interface CWilt<W> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => (wa: HKT<W, A>) => Kind4<F, unknown, R, E, Separated<HKT<W, B>, HKT<W, C>>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => (wa: HKT<W, A>) => Kind4<F, S, R, E, Separated<HKT<W, B>, HKT<W, C>>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => (wa: HKT<W, A>) => Kind4<F, unknown, R, E, Separated<HKT<W, B>, HKT<W, C>>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => (wa: HKT<W, A>) => Kind4<F, S, R, E, Separated<HKT<W, B>, HKT<W, C>>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => (wa: HKT<W, A>) => Kind4<F, S, R, E, Separated<HKT<W, B>, HKT<W, C>>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B, C>(
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => (wa: HKT<W, A>) => Kind3<F, R, E, Separated<HKT<W, B>, HKT<W, C>>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B, C>(
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => (wa: HKT<W, A>) => Kind3<F, R, E, Separated<HKT<W, B>, HKT<W, C>>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B, C>(
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => (wa: HKT<W, A>) => Kind2<F, E, Separated<HKT<W, B>, HKT<W, C>>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B, C>(
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => (wa: HKT<W, A>) => Kind2<F, E, Separated<HKT<W, B>, HKT<W, C>>>
  <F extends URIS>(F: CApplicative1<F>): <A, B, C>(
    f: (a: A) => Kind<F, Either<B, C>>
  ) => (wa: HKT<W, A>) => Kind<F, Separated<HKT<W, B>, HKT<W, C>>>
  <F>(F: CApplicative<F>): <A, B, C>(
    f: (a: A) => HKT<F, Either<B, C>>
  ) => (wa: HKT<W, A>) => HKT<F, Separated<HKT<W, B>, HKT<W, C>>>
}

export interface CWilt1<W extends URIS> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => (wa: Kind<W, A>) => Kind4<F, unknown, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => (wa: Kind<W, A>) => Kind4<F, unknown, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => (wa: Kind<W, A>) => Kind4<F, S, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => (wa: Kind<W, A>) => Kind4<F, S, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B, C>(
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => (wa: Kind<W, A>) => Kind4<F, S, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B, C>(
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => (wa: Kind<W, A>) => Kind3<F, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B, C>(
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => (wa: Kind<W, A>) => Kind3<F, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B, C>(
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => (wa: Kind<W, A>) => Kind2<F, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B, C>(
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => (wa: Kind<W, A>) => Kind2<F, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS>(F: CApplicative1<F>): <A, B, C>(
    f: (a: A) => Kind<F, Either<B, C>>
  ) => (wa: Kind<W, A>) => Kind<F, Separated<Kind<W, B>, Kind<W, C>>>
  <F>(F: CApplicative<F>): <A, B, C>(
    f: (a: A) => HKT<F, Either<B, C>>
  ) => (wa: Kind<W, A>) => HKT<F, Separated<Kind<W, B>, Kind<W, C>>>
}

export interface Wilt1<W extends URIS> {
  <F extends MaURIS, E>(F: CApplicative4MAPC<F, E>): <A, S, R, B, C>(
    wa: Kind<W, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, unknown, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, E, B, C>(
    wa: Kind<W, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, unknown, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends MaURIS, E>(F: CApplicative4MAC<F, E>): <A, S, R, B, C>(
    wa: Kind<W, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, E, B, C>(
    wa: Kind<W, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, E, B, C>(
    wa: Kind<W, A>,
    f: (a: A) => Kind4<F, S, R, E, Either<B, C>>
  ) => Kind4<F, S, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, E, B, C>(
    wa: Kind<W, A>,
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => Kind3<F, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS3, E>(F: CApplicative3C<F, E>): <A, R, B, C>(
    wa: Kind<W, A>,
    f: (a: A) => Kind3<F, R, E, Either<B, C>>
  ) => Kind3<F, R, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS2>(F: CApplicative2<F>): <A, E, B, C>(
    wa: Kind<W, A>,
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => Kind2<F, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS2, E>(F: CApplicative2C<F, E>): <A, B, C>(
    wa: Kind<W, A>,
    f: (a: A) => Kind2<F, E, Either<B, C>>
  ) => Kind2<F, E, Separated<Kind<W, B>, Kind<W, C>>>
  <F extends URIS>(F: CApplicative1<F>): <A, B, C>(
    wa: Kind<W, A>,
    f: (a: A) => Kind<F, Either<B, C>>
  ) => Kind<F, Separated<Kind<W, B>, Kind<W, C>>>
  <F>(F: CApplicative<F>): <A, B, C>(
    wa: Kind<W, A>,
    f: (a: A) => HKT<F, Either<B, C>>
  ) => HKT<F, Separated<Kind<W, B>, Kind<W, C>>>
}

export interface CWilt2<W extends URIS2> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => <WE>(
    wa: Kind2<W, WE, A>
  ) => Kind4<F, unknown, R, FE, Separated<Kind2<W, WE, B>, Kind2<W, WE, C>>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => <WE>(
    wa: Kind2<W, WE, A>
  ) => Kind4<F, S, R, FE, Separated<Kind2<W, WE, B>, Kind2<W, WE, C>>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B, C>(
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => <WE>(
    wa: Kind2<W, WE, A>
  ) => Kind4<F, unknown, R, FE, Separated<Kind2<W, WE, B>, Kind2<W, WE, C>>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B, C>(
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => <WE>(
    wa: Kind2<W, WE, A>
  ) => Kind4<F, S, R, FE, Separated<Kind2<W, WE, B>, Kind2<W, WE, C>>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B, C>(
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => <WE>(
    wa: Kind2<W, WE, A>
  ) => Kind4<F, S, R, FE, Separated<Kind2<W, WE, B>, Kind2<W, WE, C>>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B, C>(
    f: (a: A) => Kind3<F, R, FE, Either<B, C>>
  ) => <WE>(
    wa: Kind2<W, WE, A>
  ) => Kind3<F, R, FE, Separated<Kind2<W, WE, B>, Kind2<W, WE, C>>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B, C>(
    f: (a: A) => Kind2<F, FE, Either<B, C>>
  ) => <WE>(
    wa: Kind2<W, WE, A>
  ) => Kind2<F, FE, Separated<Kind2<W, WE, B>, Kind2<W, WE, C>>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B, C>(
    f: (a: A) => Kind2<F, FE, Either<B, C>>
  ) => <WE>(
    wa: Kind2<W, WE, A>
  ) => Kind2<F, FE, Separated<Kind2<W, WE, B>, Kind2<W, WE, C>>>
  <F extends URIS>(F: CApplicative1<F>): <A, B, C>(
    f: (a: A) => Kind<F, Either<B, C>>
  ) => <WE>(wa: Kind2<W, WE, A>) => Kind<F, Separated<Kind2<W, WE, B>, Kind2<W, WE, C>>>
  <F>(F: CApplicative<F>): <A, B, C>(
    f: (a: A) => HKT<F, Either<B, C>>
  ) => <WE>(wa: Kind2<W, WE, A>) => HKT<F, Separated<Kind2<W, WE, B>, Kind2<W, WE, C>>>
}

export interface CWilt2C<W extends URIS2, E> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => (
    wa: Kind2<W, E, A>
  ) => Kind4<F, unknown, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B, C>(
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => (
    wa: Kind2<W, E, A>
  ) => Kind4<F, S, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B, C>(
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => (
    wa: Kind2<W, E, A>
  ) => Kind4<F, unknown, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B, C>(
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => (
    wa: Kind2<W, E, A>
  ) => Kind4<F, S, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B, C>(
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => (
    wa: Kind2<W, E, A>
  ) => Kind4<F, S, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B, C>(
    f: (a: A) => Kind3<F, R, FE, Either<B, C>>
  ) => (
    wa: Kind2<W, E, A>
  ) => Kind3<F, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B, C>(
    f: (a: A) => Kind2<F, FE, Either<B, C>>
  ) => (wa: Kind2<W, E, A>) => Kind2<F, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B, C>(
    f: (a: A) => Kind2<F, FE, Either<B, C>>
  ) => (wa: Kind2<W, E, A>) => Kind2<F, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends URIS>(F: CApplicative1<F>): <A, B, C>(
    f: (a: A) => Kind<F, Either<B, C>>
  ) => (wa: Kind2<W, E, A>) => Kind<F, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F>(F: CApplicative<F>): <A, B, C>(
    f: (a: A) => HKT<F, Either<B, C>>
  ) => (wa: Kind2<W, E, A>) => HKT<F, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
}

export interface Wilt2C<W extends URIS2, E> {
  <F extends MaURIS, FE>(F: CApplicative4MAPC<F, FE>): <A, S, R, B, C>(
    wa: Kind2<W, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => Kind4<F, unknown, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, R, B, C>(
    wa: Kind2<W, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => Kind4<F, S, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, R, FE, B, C>(
    wa: Kind2<W, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => Kind4<F, unknown, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, R, FE, B, C>(
    wa: Kind2<W, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => Kind4<F, S, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, R, FE, B, C>(
    wa: Kind2<W, E, A>,
    f: (a: A) => Kind4<F, S, R, FE, Either<B, C>>
  ) => Kind4<F, S, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends URIS3>(F: CApplicative3<F>): <A, R, FE, B, C>(
    wa: Kind2<W, E, A>,
    f: (a: A) => Kind3<F, R, FE, Either<B, C>>
  ) => Kind3<F, R, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B, C>(
    wa: Kind2<W, E, A>,
    f: (a: A) => Kind2<F, FE, Either<B, C>>
  ) => Kind2<F, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B, C>(
    wa: Kind2<W, E, A>,
    f: (a: A) => Kind2<F, FE, Either<B, C>>
  ) => Kind2<F, FE, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F extends URIS>(F: CApplicative1<F>): <A, B, C>(
    wa: Kind2<W, E, A>,
    f: (a: A) => Kind<F, Either<B, C>>
  ) => Kind<F, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
  <F>(F: CApplicative<F>): <A, B, C>(
    wa: Kind2<W, E, A>,
    f: (a: A) => HKT<F, Either<B, C>>
  ) => HKT<F, Separated<Kind2<W, E, B>, Kind2<W, E, C>>>
}

export interface CWilt3<W extends URIS3> {
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, FR, B, C>(
    f: (a: A) => Kind4<F, S, FR, FE, Either<B, C>>
  ) => <WR, WE>(
    wa: Kind3<W, WR, WE, A>
  ) => Kind4<F, unknown, FR, FE, Separated<Kind3<W, WR, WE, B>, Kind3<W, WR, WE, C>>>
  <F extends MaURIS, FE>(F: CApplicative4MAC<F, FE>): <A, S, FR, B, C>(
    f: (a: A) => Kind4<F, S, FR, FE, Either<B, C>>
  ) => <WR, WE>(
    wa: Kind3<W, WR, WE, A>
  ) => Kind4<F, S, FR, FE, Separated<Kind3<W, WR, WE, B>, Kind3<W, WR, WE, C>>>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <A, S, FR, FE, B, C>(
    f: (a: A) => Kind4<F, S, FR, FE, Either<B, C>>
  ) => <WR, WE>(
    wa: Kind3<W, WR, WE, A>
  ) => Kind4<F, unknown, FR, FE, Separated<Kind3<W, WR, WE, B>, Kind3<W, WR, WE, C>>>
  <F extends MaURIS>(F: CApplicative4MA<F>): <A, S, FR, FE, B, C>(
    f: (a: A) => Kind4<F, S, FR, FE, Either<B, C>>
  ) => <WR, WE>(
    wa: Kind3<W, WR, WE, A>
  ) => Kind4<F, S, FR, FE, Separated<Kind3<W, WR, WE, B>, Kind3<W, WR, WE, C>>>
  <F extends URIS4>(F: CApplicative4<F>): <A, S, FR, FE, B, C>(
    f: (a: A) => Kind4<F, S, FR, FE, Either<B, C>>
  ) => <WR, WE>(
    wa: Kind3<W, WR, WE, A>
  ) => Kind4<F, S, FR, FE, Separated<Kind3<W, WR, WE, B>, Kind3<W, WR, WE, C>>>
  <F extends URIS3>(F: CApplicative3<F>): <A, FR, FE, B, C>(
    f: (a: A) => Kind3<F, FR, FE, Either<B, C>>
  ) => <WR, WE>(
    wa: Kind3<W, WR, WE, A>
  ) => Kind3<F, FR, FE, Separated<Kind3<W, WR, WE, B>, Kind3<W, WR, WE, C>>>
  <F extends URIS2>(F: CApplicative2<F>): <A, FE, B, C>(
    f: (a: A) => Kind2<F, FE, Either<B, C>>
  ) => <WR, WE>(
    wa: Kind3<W, WR, WE, A>
  ) => Kind2<F, FE, Separated<Kind3<W, WR, WE, B>, Kind3<W, WR, WE, C>>>
  <F extends URIS2, FE>(F: CApplicative2C<F, FE>): <A, B, C>(
    f: (a: A) => Kind2<F, FE, Either<B, C>>
  ) => <WR, WE>(
    wa: Kind3<W, WR, WE, A>
  ) => Kind2<F, FE, Separated<Kind3<W, WR, WE, B>, Kind3<W, WR, WE, C>>>
  <F extends URIS>(F: CApplicative1<F>): <A, B, C>(
    f: (a: A) => Kind<F, Either<B, C>>
  ) => <WR, WE>(
    wa: Kind3<W, WR, WE, A>
  ) => Kind<F, Separated<Kind3<W, WR, WE, B>, Kind3<W, WR, WE, C>>>
  <F>(F: CApplicative<F>): <A, B, C>(
    f: (a: A) => HKT<F, Either<B, C>>
  ) => <WR, WE>(
    wa: Kind3<W, WR, WE, A>
  ) => HKT<F, Separated<Kind3<W, WR, WE, B>, Kind3<W, WR, WE, C>>>
}
