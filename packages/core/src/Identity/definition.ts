// ets_tracing: off

import type { Associative } from "../Associative/index.js"

/**
 * Equivalent to a Monoid
 */
export interface Identity<A> extends Associative<A> {
  readonly identity: A
}
