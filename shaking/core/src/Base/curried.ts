import type {
  Applicative,
  Applicative1,
  Applicative2,
  Applicative2C,
  Applicative3,
  Applicative3C
} from "fp-ts/lib/Applicative"
import type { HKT, Kind, Kind2, Kind3, Kind4, URIS, URIS2, URIS3 } from "fp-ts/lib/HKT"

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
