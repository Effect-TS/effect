import { HasURI, HKT, Kind6, URIS6 } from "../HKT"

export interface InvariantF<F> extends HasURI<F> {
  readonly Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: (ma: HKT<F, A>) => HKT<F, B>
    g: (mb: HKT<F, B>) => HKT<F, A>
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

export function makeInvariant<URI extends URIS6>(
  _: URI
): (_: Omit<Invariant6<URI>, "URI" | "Invariant">) => Invariant6<URI>
export function makeInvariant<URI>(
  URI: URI
): (_: Omit<InvariantF<URI>, "URI" | "Invariant">) => InvariantF<URI> {
  return (_) => ({
    URI,
    Invariant: "Invariant",
    ..._
  })
}
