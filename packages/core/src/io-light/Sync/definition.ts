import type * as UT from "../../data/Utils"
import { _A, _E, _R } from "../../support/Symbols"
import type { XPure } from "../XPure"

/**
 * @tsplus type ets/Sync
 */
export interface Sync<R, E, A> extends XPure<unknown, unknown, unknown, R, E, A> {}

export interface UIO<A> extends Sync<unknown, never, A> {}
export interface RIO<R, A> extends Sync<R, never, A> {}
export interface IO<E, A> extends Sync<unknown, E, A> {}

/**
 * @tsplus type ets/SyncOps
 */
export interface SyncOps {}
export const Sync: SyncOps = {}

/**
 * @tsplus unify ets/Sync
 */
export function unify<X extends Sync<any, any, any>>(
  self: X
): Sync<UT._R<X>, UT._E<X>, UT._A<X>> {
  return self
}

/**
 * @tsplus macro remove
 */
export function concreteXPure<R, E, A>(
  _: Sync<R, E, A>
): asserts _ is XPure<unknown, unknown, unknown, R, E, A> {
  //
}
