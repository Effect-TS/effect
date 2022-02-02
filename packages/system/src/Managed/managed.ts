// ets_tracing: off

import type * as Tp from "../Collections/Immutable/Tuple/index.js"
import type { HasUnify } from "../Utils/index.js"
import { unifyIndex } from "../Utils/index.js"
import * as T from "./deps-core.js"
import type { Finalizer, ReleaseMap } from "./ReleaseMap/index.js"

export const ManagedURI = "@matechs/core/Eff/ManagedURI"
export type ManagedURI = typeof ManagedURI

export interface Managed<R, E, A> extends HasUnify {
  readonly [unifyIndex]: ManagedURI
  readonly [T._U]: ManagedURI
  readonly [T._E]: () => E
  readonly [T._A]: () => A
  readonly [T._R]: (_: R) => void

  readonly effect: T.Effect<Tp.Tuple<[R, ReleaseMap]>, E, Tp.Tuple<[Finalizer, A]>>
}

export class ManagedImpl<R, E, A> implements Managed<R, E, A> {
  readonly [unifyIndex]: ManagedURI;
  readonly [T._U]: ManagedURI;
  readonly [T._E]: () => E;
  readonly [T._A]: () => A;
  readonly [T._R]: (_: R) => void

  constructor(
    readonly effect: T.Effect<Tp.Tuple<[R, ReleaseMap]>, E, Tp.Tuple<[Finalizer, A]>>
  ) {}
}

export function managedApply<R, E, A>(
  effect: T.Effect<Tp.Tuple<[R, ReleaseMap]>, E, Tp.Tuple<[Finalizer, A]>>
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
