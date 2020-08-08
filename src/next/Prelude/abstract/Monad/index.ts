import { Covariant6, CovariantF } from "../Covariant"
import { URIS6 } from "../HKT"
import { IdentityFlatten6, IdentityFlattenF } from "../IdentityFlatten"

export type MonadF<F> = IdentityFlattenF<F> & CovariantF<F>

export type Monad6<F extends URIS6> = IdentityFlatten6<F> & Covariant6<F>

export function makeMonad<URI extends URIS6>(
  _: URI
): (_: Omit<Monad6<URI>, "URI">) => Monad6<URI>
export function makeMonad<URI>(URI: URI): (_: Omit<MonadF<URI>, "URI">) => MonadF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
