import {
  CovariantF,
  Covariant1,
  Covariant2,
  Covariant3,
  Covariant4,
  Covariant5,
  Covariant6
} from "../Covariant"
import { URIS, URIS2, URIS3, URIS4, URIS5, URIS6 } from "../HKT"
import {
  IdentityFlattenF,
  IdentityFlatten1,
  IdentityFlatten2,
  IdentityFlatten3,
  IdentityFlatten4,
  IdentityFlatten5,
  IdentityFlatten6
} from "../IdentityFlatten"

export type MonadF<F> = IdentityFlattenF<F> & CovariantF<F>

export type Monad1<F extends URIS> = IdentityFlatten1<F> & Covariant1<F>

export type Monad2<F extends URIS2> = IdentityFlatten2<F> & Covariant2<F>

export type Monad3<F extends URIS3> = IdentityFlatten3<F> & Covariant3<F>

export type Monad4<F extends URIS4> = IdentityFlatten4<F> & Covariant4<F>

export type Monad5<F extends URIS5> = IdentityFlatten5<F> & Covariant5<F>

export type Monad6<F extends URIS6> = IdentityFlatten6<F> & Covariant6<F>

export function makeMonad<URI extends URIS>(
  _: URI
): (_: Omit<Monad1<URI>, "URI">) => Monad1<URI>
export function makeMonad<URI extends URIS2>(
  _: URI
): (_: Omit<Monad2<URI>, "URI">) => Monad2<URI>
export function makeMonad<URI extends URIS3>(
  _: URI
): (_: Omit<Monad3<URI>, "URI">) => Monad3<URI>
export function makeMonad<URI extends URIS4>(
  _: URI
): (_: Omit<Monad4<URI>, "URI">) => Monad4<URI>
export function makeMonad<URI extends URIS5>(
  _: URI
): (_: Omit<Monad5<URI>, "URI">) => Monad5<URI>
export function makeMonad<URI extends URIS6>(
  _: URI
): (_: Omit<Monad6<URI>, "URI">) => Monad6<URI>
export function makeMonad<URI>(URI: URI): (_: Omit<MonadF<URI>, "URI">) => MonadF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
