/**
 * @since 1.0.0
 */
import { URIS, Derive } from "../../Prelude"
import { Associative } from "../Associative"

/**
 * @since 1.0.0
 */
export const IdentityURI = "Identity"
/**
 * @since 1.0.0
 */
export type IdentityURI = typeof IdentityURI

/**
 * Equivalent to a Monoid
 *
 * @since 1.0.0
 */
export interface Identity<A> extends Associative<A> {
  readonly identity: A
}

declare module "../../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [IdentityURI]: Identity<A>
  }
}

/**
 * @since 1.0.0
 */
export function makeIdentity<A>(identity: A, op: (y: A) => (x: A) => A): Identity<A> {
  return {
    combine: op,
    identity
  }
}

/**
 * @since 1.0.0
 */
export function deriveIdentity<F extends URIS, A>(
  D: Derive<F, IdentityURI>,
  I: Identity<A>
) {
  return D.derive(I)
}
