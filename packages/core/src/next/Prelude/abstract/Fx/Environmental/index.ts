import { pipe } from "../../../../../Function"
import { CovariantF, CovariantK } from "../../Covariant"
import { HKT3, HKT6, Kind, URIS } from "../../HKT"
import { IdentityFlattenF, IdentityFlattenK } from "../../IdentityFlatten"
import { AccessF, AccessK } from "../Access"

export type EnvironmentalF<F> = IdentityFlattenF<F> & AccessF<F> & CovariantF<F>

export type EnvironmentalK<F extends URIS> = IdentityFlattenK<F> &
  AccessK<F> &
  CovariantK<F>

export function makeEnvironmental<URI extends URIS>(
  _: URI
): (_: Omit<EnvironmentalK<URI>, "URI" | "Environmental">) => EnvironmentalK<URI>
export function makeEnvironmental<URI>(
  URI: URI
): (_: Omit<EnvironmentalF<URI>, "URI" | "Environmental">) => EnvironmentalF<URI>
export function makeEnvironmental<URI>(
  URI: URI
): (_: Omit<EnvironmentalF<URI>, "URI" | "Environmental">) => EnvironmentalF<URI> {
  return (_) => ({
    URI,
    Environmental: "Environmental",
    ..._
  })
}

export function accessMF<F extends URIS>(
  F: EnvironmentalK<F>
): <Y, X, S, R, R1, E, A>(
  f: (r: R) => Kind<F, Y, X, S, R1, E, A>
) => Kind<F, Y, X, S, R & R1, E, A>
export function accessMF<F>(
  F: EnvironmentalF<F>
): <X, I, S, R, E, R0, A>(
  f: (r: R0) => HKT6<F, X, I, S, R, E, A>
) => HKT6<F, X, I, S, R & R0, E, A>
export function accessMF<F>(
  F: EnvironmentalF<F>
): <E, R, R1, A>(f: (r: R) => HKT3<F, R1, E, A>) => HKT3<F, R & R1, E, A> {
  return <R, R1, E, A>(f: (r: R) => HKT3<F, R1, E, A>): HKT3<F, R & R1, E, A> =>
    pipe(
      F.access((r: R) => f(r)),
      F.flatten
    )
}

export function provideSomeF<F extends URIS>(
  F: EnvironmentalK<F>
): <R0, R>(
  f: (r: R0) => R
) => <X, I, S, E, A>(fa: Kind<F, X, I, S, R, E, A>) => Kind<F, X, I, S, R0, E, A>
export function provideSomeF<F>(
  F: EnvironmentalF<F>
): <R0, R>(
  f: (r: R0) => R
) => <X, I, S, E, A>(fa: HKT6<F, X, I, S, R, E, A>) => HKT6<F, X, I, S, R0, E, A>
export function provideSomeF<F>(
  F: EnvironmentalF<F>
): <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) => HKT3<F, R0, E, A> {
  return <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) =>
    accessMF(F)((r: R0) => F.provide(f(r))(fa))
}
