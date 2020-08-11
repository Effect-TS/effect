import { CovariantF, CovariantK } from "../../Covariant"
import { URIS } from "../../HKT"
import { IdentityFlattenF, IdentityFlattenK } from "../../IdentityFlatten"
import { AccessF, AccessK } from "../Access"

export type EnvironmentalF<F, Fix = any> = IdentityFlattenF<F, Fix> &
  AccessF<F, Fix> &
  CovariantF<F, Fix>

export type EnvironmentalK<F extends URIS, Fix = any> = IdentityFlattenK<F, Fix> &
  AccessK<F, Fix> &
  CovariantK<F, Fix>

export function makeEnvironmental<URI extends URIS, Fix = any>(
  _: URI
): (
  _: Omit<EnvironmentalK<URI, Fix>, "URI" | "Fix" | "Environmental">
) => EnvironmentalK<URI, Fix>
export function makeEnvironmental<URI, Fix = any>(
  URI: URI
): (
  _: Omit<EnvironmentalF<URI, Fix>, "URI" | "Fix" | "Environmental">
) => EnvironmentalF<URI, Fix>
export function makeEnvironmental<URI, Fix = any>(
  URI: URI
): (
  _: Omit<EnvironmentalF<URI, Fix>, "URI" | "Fix" | "Environmental">
) => EnvironmentalF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    Environmental: "Environmental",
    ..._
  })
}
