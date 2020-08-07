import { pipe } from "../../../../Function"
import {
  AssociativeFlatten2,
  AssociativeFlatten3,
  AssociativeFlatten4,
  AssociativeFlatten5,
  AssociativeFlatten6,
  AssociativeFlattenF2
} from "../AssociativeFlatten"
import {
  Environmental2,
  Environmental3,
  Environmental4,
  Environmental5,
  Environmental6,
  EnvironmentalF
} from "../Environmental"
import {
  HKT2,
  Kind2,
  Kind3,
  Kind4,
  Kind5,
  Kind6,
  URIS2,
  URIS3,
  URIS4,
  URIS5,
  URIS6
} from "../HKT"

export type ContextualF<F> = AssociativeFlattenF2<F> & EnvironmentalF<F>

export type Contextual2<F extends URIS2> = AssociativeFlatten2<F> & Environmental2<F>

export type Contextual3<F extends URIS3> = AssociativeFlatten3<F> & Environmental3<F>

export type Contextual4<F extends URIS4> = AssociativeFlatten4<F> & Environmental4<F>

export type Contextual5<F extends URIS5> = AssociativeFlatten5<F> & Environmental5<F>

export type Contextual6<F extends URIS6> = AssociativeFlatten6<F> & Environmental6<F>

export function makeContextual<URI extends URIS2>(
  _: URI
): (_: Omit<Contextual2<URI>, "URI" | "Contextual">) => Contextual2<URI>
export function makeContextual<URI extends URIS3>(
  _: URI
): (_: Omit<Contextual3<URI>, "URI" | "Contextual">) => Contextual3<URI>
export function makeContextual<URI extends URIS4>(
  _: URI
): (_: Omit<Contextual4<URI>, "URI" | "Contextual">) => Contextual4<URI>
export function makeContextual<URI extends URIS5>(
  _: URI
): (_: Omit<Contextual5<URI>, "URI" | "Contextual">) => Contextual5<URI>
export function makeContextual<URI extends URIS6>(
  _: URI
): (_: Omit<Contextual6<URI>, "URI" | "Contextual">) => Contextual6<URI>
export function makeContextual<URI>(
  URI: URI
): (_: Omit<ContextualF<URI>, "URI" | "Contextual">) => ContextualF<URI> {
  return (_) => ({
    URI,
    Contextual: "Contextual",
    ..._
  })
}

export function accessMF<F extends URIS6>(
  F: Contextual6<F>
): <Y, X, S, R, R1, E, A>(
  f: (r: R) => Kind6<F, Y, X, S, R1, E, A>
) => Kind6<F, Y, X, S, R & R1, E, A>
export function accessMF<F extends URIS5>(
  F: Contextual5<F>
): <X, S, R, R1, E, A>(
  f: (r: R) => Kind5<F, X, S, R1, E, A>
) => Kind5<F, X, S, R & R1, E, A>
export function accessMF<F extends URIS4>(
  F: Contextual4<F>
): <S, R, R1, E, A>(f: (r: R) => Kind4<F, S, R1, E, A>) => Kind4<F, S, R & R1, E, A>
export function accessMF<F extends URIS3>(
  F: Contextual3<F>
): <R, R1, E, A>(f: (r: R) => Kind3<F, R1, E, A>) => Kind3<F, R & R1, E, A>
export function accessMF<F extends URIS2>(
  F: Contextual2<F>
): <R, R1, A>(f: (r: R) => Kind2<F, R1, A>) => Kind2<F, R & R1, A>
export function accessMF<F>(
  F: ContextualF<F>
): <R, R1, A>(f: (r: R) => HKT2<F, R1, A>) => HKT2<F, R & R1, A> {
  return <R, R1, A>(f: (r: R) => HKT2<F, R1, A>): HKT2<F, R & R1, A> =>
    pipe(
      F.access((r: R & R1) => f(r) as HKT2<F, R & R1, A>),
      F.flatten
    )
}
