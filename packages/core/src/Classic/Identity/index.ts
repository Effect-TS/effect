import type { IdentityURI } from "../../Modules"
import type { Derive, URIS } from "../../Prelude"
import type { Associative } from "../Associative"

export { IdentityURI } from "../../Modules"

/**
 * Equivalent to a Monoid
 */
export interface Identity<A> extends Associative<A> {
  readonly identity: A
}

export function makeIdentity<A>(identity: A, op: (y: A) => (x: A) => A): Identity<A> {
  return {
    combine: op,
    identity
  }
}

export function deriveIdentity<F extends URIS, A>(
  D: Derive<F, [IdentityURI]>,
  I: Identity<A>
) {
  return D.derive(I)
}
