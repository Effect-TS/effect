import {
  CovariantF,
  Covariant1,
  Covariant2,
  Covariant3,
  Covariant4,
  Covariant5,
  Covariant6
} from "../Covariant"
import {
  HKT,
  Kind,
  Kind2,
  Kind3,
  Kind4,
  Kind5,
  Kind6,
  URIS,
  URIS2,
  URIS3,
  URIS4,
  URIS5,
  URIS6
} from "../HKT"
import {
  IdentityBothF,
  IdentityBoth1,
  IdentityBoth2,
  IdentityBoth3,
  IdentityBoth4,
  IdentityBoth5,
  IdentityBoth6
} from "../IdentityBoth"

export interface Foreach<F> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <A, B>(
    f: (a: A) => HKT<G, B>
  ) => (fa: HKT<F, A>) => HKT<G, HKT<F, B>>
  <G extends URIS>(G: IdentityBoth1<G> & Covariant1<G>): <A, B>(
    f: (a: A) => Kind<G, B>
  ) => (fa: HKT<F, A>) => Kind<G, HKT<F, B>>
  <G extends URIS2>(G: IdentityBoth2<G> & Covariant2<G>): <E, A, B>(
    f: (a: A) => Kind2<G, E, B>
  ) => (fa: HKT<F, A>) => Kind2<G, E, HKT<F, B>>
  <G extends URIS3>(G: IdentityBoth3<G> & Covariant3<G>): <R, E, A, B>(
    f: (a: A) => Kind3<G, R, E, B>
  ) => (fa: HKT<F, A>) => Kind3<G, R, E, HKT<F, B>>
  <G extends URIS4>(G: IdentityBoth4<G> & Covariant4<G>): <S, R, E, A, B>(
    f: (a: A) => Kind4<G, S, R, E, B>
  ) => (fa: HKT<F, A>) => Kind4<G, S, R, E, HKT<F, B>>
  <G extends URIS5>(G: IdentityBoth5<G> & Covariant5<G>): <X, S, R, E, A, B>(
    f: (a: A) => Kind5<G, X, S, R, E, B>
  ) => (fa: HKT<F, A>) => Kind5<G, X, S, R, E, HKT<F, B>>
  <G extends URIS6>(G: IdentityBoth6<G> & Covariant6<G>): <Y, X, S, R, E, A, B>(
    f: (a: A) => Kind6<G, Y, X, S, R, E, B>
  ) => (fa: HKT<F, A>) => Kind6<G, Y, X, S, R, E, HKT<F, B>>
}

export interface TraversableF<F> extends CovariantF<F> {
  readonly Traversable: "Traversable"
  readonly foreach: Foreach<F>
}

export interface Foreach1<F extends URIS> {
  <G>(G: IdentityBothF<G> & CovariantF<G>): <A, B>(
    f: (a: A) => HKT<G, B>
  ) => (fa: Kind<F, A>) => HKT<G, Kind<F, B>>
  <G extends URIS>(G: IdentityBoth1<G> & Covariant1<G>): <A, B>(
    f: (a: A) => Kind<G, B>
  ) => (fa: Kind<F, A>) => Kind<G, Kind<F, B>>
  <G extends URIS2>(G: IdentityBoth2<G> & Covariant2<G>): <E, A, B>(
    f: (a: A) => Kind2<G, E, B>
  ) => (fa: Kind<F, A>) => Kind2<G, E, Kind<F, B>>
  <G extends URIS3>(G: IdentityBoth3<G> & Covariant3<G>): <R, E, A, B>(
    f: (a: A) => Kind3<G, R, E, B>
  ) => (fa: Kind<F, A>) => Kind3<G, R, E, Kind<F, B>>
  <G extends URIS4>(G: IdentityBoth4<G> & Covariant4<G>): <S, R, E, A, B>(
    f: (a: A) => Kind4<G, S, R, E, B>
  ) => (fa: Kind<F, A>) => Kind4<G, S, R, E, Kind<F, B>>
  <G extends URIS5>(G: IdentityBoth5<G> & Covariant5<G>): <X, S, R, E, A, B>(
    f: (a: A) => Kind5<G, X, S, R, E, B>
  ) => (fa: Kind<F, A>) => Kind5<G, X, S, R, E, Kind<F, B>>
  <G extends URIS6>(G: IdentityBoth6<G> & Covariant6<G>): <Y, X, S, R, E, A, B>(
    f: (a: A) => Kind6<G, Y, X, S, R, E, B>
  ) => (fa: Kind<F, A>) => Kind6<G, Y, X, S, R, E, Kind<F, B>>
}

export interface Traversable1<F extends URIS> extends Covariant1<F> {
  readonly Traversable: "Traversable"
  readonly foreach: Foreach1<F>
}

export function makeTraversable<URI extends URIS>(
  _: URI
): (_: Omit<Traversable1<URI>, "URI" | "Traversable">) => Traversable1<URI>
// export function makeTraversable<URI extends URIS2>(
//   _: URI
// ): (_: Omit<Traversable2<URI>, "URI" | "Traversable">) => Traversable2<URI>
// export function makeTraversable<URI extends URIS3>(
//   _: URI
// ): (_: Omit<Traversable3<URI>, "URI" | "Traversable">) => Traversable3<URI>
// export function makeTraversable<URI extends URIS4>(
//   _: URI
// ): (_: Omit<Traversable4<URI>, "URI" | "Traversable">) => Traversable4<URI>
// export function makeTraversable<URI extends URIS5>(
//   _: URI
// ): (_: Omit<Traversable5<URI>, "URI" | "Traversable">) => Traversable5<URI>
// export function makeTraversable<URI extends URIS6>(
//   _: URI
// ): (_: Omit<Traversable6<URI>, "URI" | "Traversable">) => Traversable6<URI>
export function makeTraversable<URI>(
  URI: URI
): (_: Omit<TraversableF<URI>, "URI" | "Traversable">) => TraversableF<URI> {
  return (_) => ({
    URI,
    Traversable: "Traversable",
    ..._
  })
}
