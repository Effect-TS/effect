import { CovariantF, CovariantK } from "../Covariant"
import { HKT6, Kind, URIS } from "../HKT"
import { IdentityBothF, IdentityBothK } from "../IdentityBoth"

export interface ForeachF<F> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <GX, GI, GS, GR, GE, A, B>(
    f: (a: A) => HKT6<G, GX, GI, GS, GR, GE, B>
  ) => <FX, FIn, FSt, FEnv, FErr>(
    fa: HKT6<F, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT6<G, GX, GI, GS, GR, GE, HKT6<F, FX, FIn, FSt, FEnv, FErr, B>>
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <Y, X, S, R, E, A, B>(
    f: (a: A) => Kind<G, Y, X, S, R, E, B>
  ) => <FX, FIn, FSt, FEnv, FErr>(
    fa: HKT6<F, FX, FIn, FSt, FEnv, FErr, A>
  ) => Kind<G, Y, X, S, R, E, HKT6<F, FX, FIn, FSt, FEnv, FErr, B>>
}

export interface TraversableF<F> extends CovariantF<F> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachF<F>
}

export interface ForeachK<F extends URIS> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <GX, GI, GS, GR, GE, A, B>(
    f: (a: A) => HKT6<G, GX, GI, GS, GR, GE, B>
  ) => <FX, FIn, FSt, FEnv, FErr>(
    fa: Kind<F, FX, FIn, FSt, FEnv, FErr, A>
  ) => HKT6<G, GX, GI, GS, GR, GE, Kind<F, FX, FIn, FSt, FEnv, FErr, B>>
  <G extends URIS>(G: IdentityBothK<G> & CovariantK<G>): <Y, X, S, R, E, A, B>(
    f: (a: A) => Kind<G, Y, X, S, R, E, B>
  ) => <FX, FIn, FSt, FEnv, FErr>(
    fa: Kind<F, FX, FIn, FSt, FEnv, FErr, A>
  ) => Kind<G, Y, X, S, R, E, Kind<F, FX, FIn, FSt, FEnv, FErr, B>>
}

export interface TraversableK<F extends URIS> extends CovariantK<F> {
  readonly Traversable: "Traversable"
  readonly foreachF: ForeachK<F>
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
