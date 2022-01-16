// ets_tracing: off

import type * as Tp from "../Collections/Immutable/Tuple"
import type { Effect } from "../Effect/definition/base"
import { _A, _E, _R, _U } from "../Effect/definition/commons"
import type { HasUnify } from "../Utils"
import { unifyIndex } from "../Utils"
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
 */
export interface Managed<R, E, A> extends HasUnify {
  readonly [unifyIndex]: ManagedURI
  readonly [_U]: ManagedURI
  readonly [_E]: () => E
  readonly [_A]: () => A
  readonly [_R]: (_: R) => void

  readonly effect: Effect<R, E, Tp.Tuple<[Finalizer, A]>>
}

export class ManagedImpl<R, E, A> implements Managed<R, E, A> {
  readonly [unifyIndex]: ManagedURI;
  readonly [_U]: ManagedURI;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
  readonly [_R]: (_: R) => void

  constructor(readonly effect: Effect<R, E, Tp.Tuple<[Finalizer, A]>>) {}
}

export function managedApply<R, E, A>(
  effect: Effect<R, E, Tp.Tuple<[Finalizer, A]>>
): Managed<R, E, A> {
  return new ManagedImpl(effect)
}

export type UIO<A> = Managed<unknown, never, A>
export type RIO<R, A> = Managed<R, never, A>
export type IO<E, A> = Managed<unknown, E, A>

declare module "../Utils" {
  export interface UnifiableIndexed<X> {
    [ManagedURI]: [X] extends [Managed<infer R, infer E, infer A>]
      ? Managed<R, E, A>
      : never
  }
}
