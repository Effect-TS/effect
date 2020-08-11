import { CovariantF, CovariantK } from "../Covariant"
import { URIS } from "../HKT"
import { IdentityFlattenF, IdentityFlattenK } from "../IdentityFlatten"

export type MonadF<F, Fix = any> = IdentityFlattenF<F, Fix> & CovariantF<F, Fix>

export type MonadK<F extends URIS, Fix = any> = IdentityFlattenK<F, Fix> &
  CovariantK<F, Fix>

export function makeMonad<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<MonadK<URI, Fix>, "URI" | "Fix">) => MonadK<URI, Fix>
export function makeMonad<URI, Fix = any>(
  URI: URI
): (_: Omit<MonadF<URI, Fix>, "URI" | "Fix">) => MonadF<URI, Fix>
export function makeMonad<URI, Fix = any>(
  URI: URI
): (_: Omit<MonadF<URI, Fix>, "URI" | "Fix">) => MonadF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    ..._
  })
}
