import { CovariantF, CovariantFE, CovariantK, CovariantKE } from "../Covariant"
import { URIS } from "../HKT"
import {
  IdentityFlattenF,
  IdentityFlattenFE,
  IdentityFlattenK,
  IdentityFlattenKE
} from "../IdentityFlatten"

export type MonadF<F> = IdentityFlattenF<F> & CovariantF<F>

export type MonadK<F extends URIS> = IdentityFlattenK<F> & CovariantK<F>

export type MonadFE<F, E> = IdentityFlattenFE<F, E> & CovariantFE<F, E>

export type MonadKE<F extends URIS, E> = IdentityFlattenKE<F, E> & CovariantKE<F, E>

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

export function makeMonadE<URI extends URIS>(
  _: URI
): <E>() => (_: Omit<MonadKE<URI, E>, "URI" | "E">) => MonadKE<URI, E>
export function makeMonadE<URI>(
  URI: URI
): <E>() => (_: Omit<MonadFE<URI, E>, "URI" | "E">) => MonadFE<URI, E>
export function makeMonadE<URI>(
  URI: URI
): <E>() => (_: Omit<MonadFE<URI, E>, "URI" | "E">) => MonadFE<URI, E> {
  return () => (_) => ({
    URI,
    E: undefined as any,
    ..._
  })
}
