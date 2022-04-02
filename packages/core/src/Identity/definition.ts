// ets_tracing: off

import type { Associative } from "../Associative/index.js"
import type { HKT } from "../Prelude/index.js"

/**
 * Equivalent to a Monoid
 */
export interface Identity<A> extends Associative<A> {
  readonly identity: A
}

export interface IdentityF extends HKT {
  readonly type: Identity<this["A"]>
}
