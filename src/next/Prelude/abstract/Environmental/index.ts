import { pipe } from "../../../../Function"
import { Access6, AccessF } from "../Access"
import { AssociativeFlatten6, AssociativeFlattenF } from "../AssociativeFlatten"
import { HKT3, Kind6, URIS6 } from "../HKT"

export type EnvironmentalF<F> = AssociativeFlattenF<F> & AccessF<F>

export type Environmental6<F extends URIS6> = AssociativeFlatten6<F> & Access6<F>

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
export function provideSomeF<F>(
  F: EnvironmentalF<F>
): <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) => HKT3<F, R0, E, A>
export function provideSomeF<F>(
  F: EnvironmentalF<F>
): <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) => HKT3<F, R0, E, A> {
  return <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) =>
    accessMF(F)((r: R0) => F.provide(f(r))(fa))
}
