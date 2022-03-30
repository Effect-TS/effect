import type { Tuple } from "../../../../../collection/immutable/Tuple"
import { _A } from "../../../../../support/Symbols"
import type { UIO } from "../../../../Effect/definition"
import { Effect } from "../../../../Effect/definition"
import type { Semaphore } from "../../../../Semaphore"
import type { Ref } from "../../../definition"
import { RefSym } from "../../../definition"
import type { SynchronizedRef } from "../../definition"

export class SynchronizedRefInternal<A> implements SynchronizedRef<A> {
  readonly [RefSym]: RefSym = RefSym;
  readonly [_A]!: () => A

  constructor(readonly ref: Ref<A>, readonly semaphore: Semaphore) {}

  get get(): UIO<A> {
    return this.ref.get
  }

  set(a: A, __tsplusTrace?: string): UIO<void> {
    return this.semaphore.withPermit(this.ref.set(a))
  }

  modify<B>(f: (a: A) => Tuple<[B, A]>, __tsplusTrace?: string): UIO<B> {
    return this.modifyEffect((a) => Effect.succeedNow(f(a)))
  }

  /**
   * Atomically modifies the `Ref.Synchronized` with the specified effectful
   * function, which computes a return value for the modification. This is a
   * more powerful version of `update`.
   */
  modifyEffect<R, E, B>(
    f: (a: A) => Effect<R, E, Tuple<[B, A]>>,
    __tsplusTrace?: string
  ): Effect<R, E, B> {
    return this.semaphore.withPermit(
      this.get.flatMap(f).flatMap(({ tuple: [b, a] }) => this.ref.set(a).as(b))
    )
  }
}

/**
 * @tsplus macro remove
 */
export function concreteSynchronizedRef<A>(
  _: SynchronizedRef<A>
): asserts _ is SynchronizedRefInternal<A> {
  //
}
