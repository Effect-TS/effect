import * as T from "./deps"
import type { Finalizer, ReleaseMap } from "./ReleaseMap"

export const ManagedURI = "@matechs/core/Eff/ManagedURI"
export type ManagedURI = typeof ManagedURI

export class Managed<R, E, A> {
  readonly [T._U]: ManagedURI;
  readonly [T._E]: () => E;
  readonly [T._A]: () => A;
  readonly [T._R]: (_: R) => void

  constructor(
    readonly effect: T.Effect<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>
  ) {}
}

export type UIO<A> = Managed<unknown, never, A>
export type RIO<R, A> = Managed<R, never, A>
export type IO<E, A> = Managed<unknown, E, A>
