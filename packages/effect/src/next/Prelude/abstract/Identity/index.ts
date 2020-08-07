import { Associative } from "../Associative"
import { Derive11 } from "../Derive"
import { Kind, URIS } from "../HKT"

export const URI = "Identity"
export type URI = typeof URI

export interface Identity<A> extends Associative<A> {
  readonly identity: A
}

declare module "../HKT" {
  interface URItoKind<A> {
    [URI]: Identity<A>
  }
}

export function make<A>(identity: A, op: (y: A) => (x: A) => A): Identity<A> {
  return {
    combine: op,
    identity
  }
}

export function deriveIdentity<F extends URIS, A>(
  D: Derive11<F, URI>,
  I: Identity<A>
): Identity<Kind<F, A>> {
  return D.derive(I)
}
