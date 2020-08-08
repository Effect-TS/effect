import { Associative } from "../Associative"
import { DeriveK } from "../abstract/Derive"
import { URIS } from "../abstract/HKT"

export const URI = "Identity"
export type URI = typeof URI

export interface Identity<A> extends Associative<A> {
  readonly identity: A
}

declare module "../abstract/HKT" {
  interface URItoKind<X, In, St, Env, Err, Out> {
    [URI]: Identity<Out>
  }
}

export function makeIdentity<A>(identity: A, op: (y: A) => (x: A) => A): Identity<A> {
  return {
    combine: op,
    identity
  }
}

export function deriveIdentity<F extends URIS, A>(D: DeriveK<F, URI>, I: Identity<A>) {
  return D.derive(I)
}
