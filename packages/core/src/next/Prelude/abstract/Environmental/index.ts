import { pipe } from "../../../../Function"
import { Access3, Access4, Access5, Access6, AccessF } from "../Access"
import {
  AssociativeFlatten3,
  AssociativeFlatten4,
  AssociativeFlatten5,
  AssociativeFlatten6,
  AssociativeFlattenF3
} from "../AssociativeFlatten"
import { HKT3, Kind3, Kind4, Kind5, Kind6, URIS3, URIS4, URIS5, URIS6 } from "../HKT"

export type EnvironmentalF<F> = AssociativeFlattenF3<F> & AccessF<F>

export type Environmental3<F extends URIS3> = AssociativeFlatten3<F> & Access3<F>

export type Environmental4<F extends URIS4> = AssociativeFlatten4<F> & Access4<F>

export type Environmental5<F extends URIS5> = AssociativeFlatten5<F> & Access5<F>

export type Environmental6<F extends URIS6> = AssociativeFlatten6<F> & Access6<F>

export function makeEnvironmental<URI extends URIS3>(
  _: URI
): (_: Omit<Environmental3<URI>, "URI" | "Environmental">) => Environmental3<URI>
export function makeEnvironmental<URI extends URIS4>(
  _: URI
): (_: Omit<Environmental4<URI>, "URI" | "Environmental">) => Environmental4<URI>
export function makeEnvironmental<URI extends URIS5>(
  _: URI
): (_: Omit<Environmental5<URI>, "URI" | "Environmental">) => Environmental5<URI>
export function makeEnvironmental<URI extends URIS6>(
  _: URI
): (_: Omit<Environmental6<URI>, "URI" | "Environmental">) => Environmental6<URI>
export function makeEnvironmental<URI>(
  URI: URI
): (_: Omit<EnvironmentalF<URI>, "URI" | "Environmental">) => EnvironmentalF<URI> {
  return (_) => ({
    URI,
    Environmental: "Environmental",
    ..._
  })
}

export function accessMF<F extends URIS6>(
  F: Environmental6<F>
): <Y, X, S, R, R1, E, A>(
  f: (r: R) => Kind6<F, Y, X, S, R1, E, A>
) => Kind6<F, Y, X, S, R & R1, E, A>
export function accessMF<F extends URIS5>(
  F: Environmental5<F>
): <X, S, R, R1, E, A>(
  f: (r: R) => Kind5<F, X, S, R1, E, A>
) => Kind5<F, X, S, R & R1, E, A>
export function accessMF<F extends URIS4>(
  F: Environmental4<F>
): <S, R, R1, E, A>(f: (r: R) => Kind4<F, S, R1, E, A>) => Kind4<F, S, R & R1, E, A>
export function accessMF<F extends URIS3>(
  F: Environmental3<F>
): <R, R1, E, A>(f: (r: R) => Kind3<F, R1, E, A>) => Kind3<F, R & R1, E, A>
export function accessMF<F>(
  F: EnvironmentalF<F>
): <E, R, R1, A>(f: (r: R) => HKT3<F, R1, E, A>) => HKT3<F, R & R1, E, A>
export function accessMF<F>(
  F: EnvironmentalF<F>
): <E, R, R1, A>(f: (r: R) => HKT3<F, R1, E, A>) => HKT3<F, R & R1, E, A> {
  return <R, R1, E, A>(f: (r: R) => HKT3<F, R1, E, A>): HKT3<F, R & R1, E, A> =>
    pipe(
      F.access((r: R) => f(r)),
      F.flatten
    )
}

export function provideSomeF<F extends URIS6>(
  F: Environmental6<F>
): <R0, R>(
  f: (r: R0) => R
) => <X, I, S, E, A>(fa: Kind6<F, X, I, S, R, E, A>) => Kind6<F, X, I, S, R0, E, A>
export function provideSomeF<F extends URIS5>(
  F: Environmental5<F>
): <R0, R>(
  f: (r: R0) => R
) => <I, S, E, A>(fa: Kind5<F, I, S, R, E, A>) => Kind5<F, I, S, R0, E, A>
export function provideSomeF<F extends URIS4>(
  F: Environmental3<F>
): <R0, R>(
  f: (r: R0) => R
) => <S, E, A>(fa: Kind4<F, S, R, E, A>) => Kind4<F, S, R0, E, A>
export function provideSomeF<F extends URIS3>(
  F: Environmental3<F>
): <R0, R>(f: (r: R0) => R) => <E, A>(fa: Kind3<F, R, E, A>) => Kind3<F, R0, E, A>
export function provideSomeF<F>(
  F: EnvironmentalF<F>
): <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) => HKT3<F, R0, E, A>
export function provideSomeF<F>(
  F: EnvironmentalF<F>
): <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) => HKT3<F, R0, E, A> {
  return <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) =>
    accessMF(F)((r: R0) => F.provide(f(r))(fa))
}
