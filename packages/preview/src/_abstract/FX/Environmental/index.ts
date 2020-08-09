import { CovariantF, CovariantK } from "../../Covariant"
import { URIS } from "../../HKT"
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
