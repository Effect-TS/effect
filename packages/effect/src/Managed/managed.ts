import * as T from "./deps"
import type { Finalizer, ReleaseMap } from "./releaseMap"

export const ManagedURI = "@matechs/core/Eff/ManagedURI"
export type ManagedURI = typeof ManagedURI

export class Managed<R, E, A> {
  readonly [T._U]: ManagedURI;
  readonly [T._E]: () => E;
  readonly [T._A]: () => A;
  readonly [T._R]: (_: R) => void

  /**
   * @note effect is always considered async becuse of ReleaseMap design, when you
   * construct managed using this low level constructor you need explicitely set S
   * at the type level because it will otherwise always infer to unknown = async
   */
  constructor(
    readonly effect: T.Effect<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>
  ) {}
}

export type UIO<A> = Managed<unknown, never, A>
export type RIO<R, A> = Managed<R, never, A>
export type IO<E, A> = Managed<unknown, E, A>
