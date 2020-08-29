import type { IdentityURI } from "../../Modules"
import type { Derive } from "../../Prelude/Derive"
import type { URIS } from "../../Prelude/HKT"
import type { Identity } from "./definition"

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
