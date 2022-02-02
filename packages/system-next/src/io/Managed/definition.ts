import type { Tuple } from "../../collection/immutable/Tuple"
import type * as UT from "../../data/Utils/types"
import { _A, _E, _R, _U } from "../../support/Symbols"
import type { Effect } from "../Effect"
import type { Finalizer } from "./ReleaseMap"

export const ManagedURI = "@matechs/core/Eff/ManagedURI"
export type ManagedURI = typeof ManagedURI

/**
 * A `Managed<R, E, A>` is a managed resource of type `A`, which may be used by
 * invoking the `use` method of the resource. The resource will be automatically
 * acquired before the resource is used, and automatically released after the
 * resource is used.
 *
 * Resources do not survive the scope of `use`, meaning that if you attempt to
 * capture the resource, leak it from `use`, and then use it after the resource
 * has been consumed, the resource will not be valid anymore and may fail with
 * some checked error, as per the type of the functions provided by the
 * resource.
 *
 * @tsplus type ets/Managed
 */
export interface Managed<R, E, A> {
  readonly [_U]: ManagedURI
  readonly [_E]: () => E
  readonly [_A]: () => A
  readonly [_R]: (_: R) => void

  readonly effect: Effect<R, E, Tuple<[Finalizer, A]>>
}

/**
 * @tsplus unify ets/Managed
 */
export function unify<X extends Managed<any, any, any>>(
  self: X
): Managed<UT._R<X>, UT._E<X>, UT._A<X>> {
  return self
}

/**
 * @tsplus type ets/ManagedOps
 */
export interface ManagedOps {}
export const Managed: ManagedOps = {}

export type UIO<A> = Managed<unknown, never, A>
export type RIO<R, A> = Managed<R, never, A>
export type IO<E, A> = Managed<unknown, E, A>

export class ManagedImpl<R, E, A> implements Managed<R, E, A> {
  readonly [_U]: ManagedURI;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
  readonly [_R]: (_: R) => void

  constructor(readonly effect: Effect<R, E, Tuple<[Finalizer, A]>>) {}
}

/**
 * Creates new `Managed` from an `Effect` value that uses a `ReleaseMap` and
 * returns a resource and a `Finalizer`.
 *
 * The correct usage of this constructor consists of:
 *   - Properly registering a `Finalizer` in the `ReleaseMap` as part of the `Effect`
 *     value;
 *   - Managing interruption safety - take care to use `Effect.uninterruptible`
 *     or `Effect.uninterruptibleMask` to verify that the `Finalizer` is
 *     registered in the `ReleaseMap` after acquiring the value;
 *   - Returning the `Finalizer` returned from `ReleaseMap.add`. This is
 *     important to prevent double-finalization.
 *
 * @tsplus static ets/ManagedOps __call
 */
export function managedApply<R, E, A>(
  effect: Effect<R, E, Tuple<[Finalizer, A]>>
): Managed<R, E, A> {
  return new ManagedImpl(effect)
}
