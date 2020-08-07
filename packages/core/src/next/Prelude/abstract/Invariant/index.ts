import {
  HKT,
  HasURI,
  URIS,
  Kind,
  Kind2,
  URIS2,
  Kind3,
  URIS3,
  Kind4,
  URIS4,
  URIS5,
  Kind5,
  URIS6,
  Kind6
} from "../HKT"

export interface Invariant<F> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: (ma: HKT<F, A>) => HKT<F, B>
    g: (mb: HKT<F, B>) => HKT<F, A>
  }
}

export interface Invariant1<F extends URIS> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: (ma: Kind<F, A>) => Kind<F, B>
    g: (mb: Kind<F, B>) => Kind<F, A>
  }
}

export interface Invariant2<F extends URIS2> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <E>(ma: Kind2<F, E, A>) => Kind2<F, E, B>
    g: <E>(mb: Kind2<F, E, B>) => Kind2<F, E, A>
  }
}

export interface Invariant3<F extends URIS3> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <R, E>(ma: Kind3<F, R, E, A>) => Kind3<F, R, E, B>
    g: <R, E>(mb: Kind3<F, R, E, B>) => Kind3<F, R, E, A>
  }
}

export interface Invariant4<F extends URIS4> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <S, R, E>(ma: Kind4<F, S, R, E, A>) => Kind4<F, S, R, E, B>
    g: <S, R, E>(mb: Kind4<F, S, R, E, B>) => Kind4<F, S, R, E, A>
  }
}

export interface Invariant5<F extends URIS5> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <X, S, R, E>(ma: Kind5<F, X, S, R, E, A>) => Kind5<F, X, S, R, E, B>
    g: <X, S, R, E>(mb: Kind5<F, X, S, R, E, B>) => Kind5<F, X, S, R, E, A>
  }
}

export interface Invariant6<F extends URIS6> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <Y, X, S, R, E>(ma: Kind6<F, S, X, S, R, E, A>) => Kind6<F, Y, X, S, R, E, B>
    g: <Y, X, S, R, E>(mb: Kind6<F, S, X, S, R, E, B>) => Kind6<F, Y, X, S, R, E, A>
  }
}

export function makeInvariant<URI extends URIS>(
  _: URI
): (_: Omit<Invariant1<URI>, "URI" | "Invariant">) => Invariant1<URI>
export function makeInvariant<URI extends URIS2>(
  _: URI
): (_: Omit<Invariant2<URI>, "URI" | "Invariant">) => Invariant2<URI>
export function makeInvariant<URI extends URIS3>(
  _: URI
): (_: Omit<Invariant3<URI>, "URI" | "Invariant">) => Invariant3<URI>
export function makeInvariant<URI extends URIS4>(
  _: URI
): (_: Omit<Invariant4<URI>, "URI" | "Invariant">) => Invariant4<URI>
export function makeInvariant<URI extends URIS5>(
  _: URI
): (_: Omit<Invariant5<URI>, "URI" | "Invariant">) => Invariant5<URI>
export function makeInvariant<URI extends URIS6>(
  _: URI
): (_: Omit<Invariant6<URI>, "URI" | "Invariant">) => Invariant6<URI>
export function makeInvariant<URI>(
  URI: URI
): (_: Omit<Invariant<URI>, "URI" | "Invariant">) => Invariant<URI> {
  return (_) => ({
    URI,
    Invariant: "Invariant",
    ..._
  })
}
