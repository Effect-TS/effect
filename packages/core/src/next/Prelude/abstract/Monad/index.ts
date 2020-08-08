import { CovariantK, CovariantF } from "../Covariant"
import { URIS } from "../HKT"
import { IdentityFlattenK, IdentityFlattenF } from "../IdentityFlatten"

export type MonadF<F> = IdentityFlattenF<F> & CovariantF<F>

export type MonadK<F extends URIS> = IdentityFlattenK<F> & CovariantK<F>

export function makeMonad<URI extends URIS>(
  _: URI
): (_: Omit<MonadK<URI>, "URI">) => MonadK<URI>
export function makeMonad<URI>(URI: URI): (_: Omit<MonadF<URI>, "URI">) => MonadF<URI>
export function makeMonad<URI>(URI: URI): (_: Omit<MonadF<URI>, "URI">) => MonadF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
