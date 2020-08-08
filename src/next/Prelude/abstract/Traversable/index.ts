import { CovariantK, CovariantF } from "../Covariant"
import { HKT, Kind, URIS } from "../HKT"
import { IdentityBothK, IdentityBothF } from "../IdentityBoth"

export interface ForeachF<F> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <A, B>(
    f: (a: A) => HKT<G, B>
  ) => (fa: HKT<F, A>) => HKT<G, HKT<F, B>>
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <Y, X, S, R, E, A, B>(
    f: (a: A) => Kind<G, Y, X, S, R, E, B>
  ) => (fa: HKT<F, A>) => Kind<G, Y, X, S, R, E, HKT<F, B>>
}

export interface TraversableF<F> extends CovariantF<F> {
  readonly Traversable: "Traversable"
  readonly foreach: ForeachF<F>
}

export interface ForeachK<F extends URIS> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <A, B>(
    f: (a: A) => HKT<G, B>
  ) => <FX, FIn, FSt, FEnv, FErr>(
    fa: Kind<F, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT<G, Kind<F, FX, FIn, FSt, FEnv, FErr, B>>
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <Y, X, S, R, E, A, B>(
    f: (a: A) => Kind<G, Y, X, S, R, E, B>
  ) => <FX, FIn, FSt, FEnv, FErr>(
    fa: Kind<F, FX, FIn, FSt, FEnv, FErr, A>
  ) => Kind<G, Y, X, S, R, E, Kind<F, FX, FIn, FSt, FEnv, FErr, B>>
}

export interface TraversableK<F extends URIS> extends CovariantK<F> {
  readonly Traversable: "Traversable"
  readonly foreach: ForeachK<F>
}

export function makeTraversable<URI extends URIS>(
  _: URI
): (_: Omit<TraversableK<URI>, "URI" | "Traversable">) => TraversableK<URI>
export function makeTraversable<URI>(
  URI: URI
): (_: Omit<TraversableF<URI>, "URI" | "Traversable">) => TraversableF<URI> {
  return (_) => ({
    URI,
    Traversable: "Traversable",
    ..._
  })
}
