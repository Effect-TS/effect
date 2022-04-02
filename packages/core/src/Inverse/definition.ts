// ets_tracing: off

import type { Identity } from "../Identity/index.js"
import type { HKT } from "../Prelude/index.js"

export interface Inverse<A> extends Identity<A> {
  /**
   * Returns a right inverse for the given `A` value, such that when
   * the value is combined with the inverse (on the right hand side),
   * the identity element is returned.
   */
  readonly inverse: (x: A, y: A) => A
}

export interface InverseF extends HKT {
  readonly type: Inverse<this["A"]>
}
