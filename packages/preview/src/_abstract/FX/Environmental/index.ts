import { CovariantF, CovariantFE, CovariantK, CovariantKE } from "../../Covariant"
import { URIS } from "../../HKT"
import {
  IdentityFlattenF,
  IdentityFlattenFE,
  IdentityFlattenK,
  IdentityFlattenKE
} from "../../IdentityFlatten"
import { AccessF, AccessFE, AccessK, AccessKE } from "../Access"

export type EnvironmentalF<F> = IdentityFlattenF<F> & AccessF<F> & CovariantF<F>

export type EnvironmentalK<F extends URIS> = IdentityFlattenK<F> &
  AccessK<F> &
  CovariantK<F>

export type EnvironmentalFE<F, E> = IdentityFlattenFE<F, E> &
  AccessFE<F, E> &
  CovariantFE<F, E>

export type EnvironmentalKE<F extends URIS, E> = IdentityFlattenKE<F, E> &
  AccessKE<F, E> &
  CovariantKE<F, E>

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

export function makeEnvironmentalE<URI extends URIS>(
  _: URI
): <E>() => (
  _: Omit<EnvironmentalKE<URI, E>, "URI" | "Environmental" | "E">
) => EnvironmentalKE<URI, E>
export function makeEnvironmentalE<URI>(
  URI: URI
): <E>() => (
  _: Omit<EnvironmentalFE<URI, E>, "URI" | "Environmental" | "E">
) => EnvironmentalFE<URI, E>
export function makeEnvironmentalE<URI>(
  URI: URI
): <E>() => (
  _: Omit<EnvironmentalFE<URI, E>, "URI" | "Environmental" | "E">
) => EnvironmentalFE<URI, E> {
  return () => (_) => ({
    URI,
    Environmental: "Environmental",
    E: undefined as any,
    ..._
  })
}
