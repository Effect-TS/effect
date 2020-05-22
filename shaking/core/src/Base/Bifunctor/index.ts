/* adapted from https://github.com/gcanti/fp-ts */

import type { Kind2, HKT2, URIS2, URIS3, Kind3, URIS4, Kind4 } from "../HKT"

export interface CBifunctor<F> {
  readonly URI: F
  readonly _F: "curried"
  readonly bimap: <E, A, G, B>(
    f: (e: E) => G,
    g: (a: A) => B
  ) => (fea: HKT2<F, E, A>) => HKT2<F, G, B>
  readonly mapLeft: <E, G>(f: (e: E) => G) => <A>(fea: HKT2<F, E, A>) => HKT2<F, G, A>
}

export interface CBifunctor2<F extends URIS2> {
  readonly URI: F
  readonly _F: "curried"
  readonly bimap: <E, A, G, B>(
    f: (e: E) => G,
    g: (a: A) => B
  ) => (fea: Kind2<F, E, A>) => Kind2<F, G, B>
  readonly mapLeft: <E, G>(f: (e: E) => G) => <A>(fea: Kind2<F, E, A>) => Kind2<F, G, A>
}

export interface CBifunctor2C<F extends URIS2, E> {
  readonly URI: F
  readonly _E: E
  readonly _F: "curried"
  readonly bimap: <A, G, B>(
    f: (e: E) => G,
    g: (a: A) => B
  ) => (fea: Kind2<F, E, A>) => Kind2<F, G, B>
  readonly mapLeft: <M>(f: (e: E) => M) => <A>(fea: Kind2<F, E, A>) => Kind2<F, M, A>
}

export interface CBifunctor3<F extends URIS3> {
  readonly URI: F
  readonly _F: "curried"
  readonly bimap: <E, A, G, B>(
    f: (e: E) => G,
    g: (a: A) => B
  ) => <R>(fea: Kind3<F, R, E, A>) => Kind3<F, R, G, B>
  readonly mapLeft: <E, G>(
    f: (e: E) => G
  ) => <R, A>(fea: Kind3<F, R, E, A>) => Kind3<F, R, G, A>
}

export interface CBifunctor3C<F extends URIS3, E> {
  readonly URI: F
  readonly _F: "curried"
  readonly bimap: <A, G, B>(
    f: (e: E) => G,
    g: (a: A) => B
  ) => <R>(fea: Kind3<F, R, E, A>) => Kind3<F, R, G, B>
  readonly mapLeft: <G>(
    f: (e: E) => G
  ) => <R, A>(fea: Kind3<F, R, E, A>) => Kind3<F, R, G, A>
}

export interface CBifunctor4<F extends URIS4> {
  readonly URI: F
  readonly _F: "curried"
  readonly bimap: <E, A, G, B>(
    f: (e: E) => G,
    g: (a: A) => B
  ) => <S, R>(fea: Kind4<F, S, R, E, A>) => Kind4<F, S, R, G, B>
  readonly mapLeft: <E, G>(
    f: (e: E) => G
  ) => <S, R, A>(fea: Kind4<F, S, R, E, A>) => Kind4<F, S, R, G, A>
}
