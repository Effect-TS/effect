import type { _A, _E, _R } from "@effect/core/io/Effect/definition/base";

/**
 * @tsplus type ets/Sync
 */
export interface Sync<R, E, A> extends XPure<unknown, unknown, unknown, R, E, A> {}

export interface UIO<A> extends Sync<unknown, never, A> {}
export interface RIO<R, A> extends Sync<R, never, A> {}
export interface IO<E, A> extends Sync<unknown, E, A> {}

/**
 * @tsplus type ets/Sync/Ops
 */
export interface SyncOps {
  $: SyncAspects;
}
export const Sync: SyncOps = {
  $: {}
};

/**
 * @tsplus type ets/Sync/Aspects
 */
export interface SyncAspects {}

/**
 * @tsplus unify ets/Sync
 */
export function unifySync<X extends Sync<any, any, any>>(
  self: X
): Sync<
  [X] extends [{ [_R]: (_: infer R) => void; }] ? R : never,
  [X] extends [{ [_E]: () => infer E; }] ? E : never,
  [X] extends [{ [_A]: () => infer A; }] ? A : never
> {
  return self;
}

/**
 * @tsplus macro remove
 */
export function concreteXPure<R, E, A>(
  _: Sync<R, E, A>
): asserts _ is XPure<unknown, unknown, unknown, R, E, A> {
  //
}
