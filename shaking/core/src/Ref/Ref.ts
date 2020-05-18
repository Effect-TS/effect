import * as T from "../Effect"
import type { FunctionN } from "../Function"

export interface Ref<A> {
  /**
   * Get the current value of the Ref
   */
  readonly get: T.Sync<A>
  /**
   * Set the current value of the ref
   * @param a
   */
  readonly set: (a: A) => T.Sync<A>
  /**
   * Update the current value of the ref with a function.
   * Produces the new value
   * @param f
   */
  readonly update: (f: FunctionN<[A], A>) => T.Sync<A>
  /**
   * Update the current value of a ref with a function.
   *
   * This function may return a second value of type B that will be produced on complete
   * @param f
   */
  readonly modify: <B>(f: FunctionN<[A], readonly [B, A]>) => T.Sync<B>
}
