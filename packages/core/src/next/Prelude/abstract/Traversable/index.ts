import { Covariant6, CovariantF } from "../Covariant"
import { HKT, Kind6, URIS6 } from "../HKT"
import { IdentityBoth6, IdentityBothF } from "../IdentityBoth"

export interface Foreach<F> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <A, B>(
    f: (a: A) => HKT<G, B>
  ) => (fa: HKT<F, A>) => HKT<G, HKT<F, B>>
  <G extends URIS6>(G: IdentityBoth6<G> & Covariant6<G>): <Y, X, S, R, E, A, B>(
    f: (a: A) => Kind6<G, Y, X, S, R, E, B>
  ) => (fa: HKT<F, A>) => Kind6<G, Y, X, S, R, E, HKT<F, B>>
}

export interface TraversableF<F> extends CovariantF<F> {
  readonly Traversable: "Traversable"
  readonly foreach: Foreach<F>
}

export interface Foreach6<F extends URIS6> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <A, B>(
    f: (a: A) => HKT<G, B>
  ) => <FX, FIn, FSt, FEnv, FErr>(
    fa: Kind6<F, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT<G, Kind6<F, FX, FIn, FSt, FEnv, FErr, B>>
  <G extends URIS6>(G: IdentityBoth6<G> & Covariant6<G>): <Y, X, S, R, E, A, B>(
    f: (a: A) => Kind6<G, Y, X, S, R, E, B>
  ) => <FX, FIn, FSt, FEnv, FErr>(
    fa: Kind6<F, FX, FIn, FSt, FEnv, FErr, A>
  ) => Kind6<G, Y, X, S, R, E, Kind6<F, FX, FIn, FSt, FEnv, FErr, B>>
}

export interface Traversable6<F extends URIS6> extends Covariant6<F> {
  readonly Traversable: "Traversable"
  readonly foreach: Foreach6<F>
}

export function makeTraversable<URI extends URIS6>(
  _: URI
): (_: Omit<Traversable6<URI>, "URI" | "Traversable">) => Traversable6<URI>
export function makeTraversable<URI>(
  URI: URI
): (_: Omit<TraversableF<URI>, "URI" | "Traversable">) => TraversableF<URI> {
  return (_) => ({
    URI,
    Traversable: "Traversable",
    ..._
  })
}
