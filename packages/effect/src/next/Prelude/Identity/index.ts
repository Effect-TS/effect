import { Associative } from "../Associative"
import { Derive66 } from "../abstract/Derive"
import { URIS6 } from "../abstract/HKT"

export const URI = "Identity"
export type URI = typeof URI

export interface Identity<A> extends Associative<A> {
  readonly identity: A
}

declare module "../abstract/HKT" {
  interface URItoKind6<X, In, St, Env, Err, Out> {
    [URI]: Identity<Out>
  }
}

export function makeIdentity<A>(identity: A, op: (y: A) => (x: A) => A): Identity<A> {
  return {
    combine: op,
    identity
  }
}

export function deriveIdentity<F extends URIS6, A>(
  D: Derive66<F, URI>,
  I: Identity<A>
) {
  return D.derive(I)
}
