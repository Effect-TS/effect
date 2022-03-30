import type { LazyArg } from "../../../../data/Function"
import { Effect } from "../../../Effect"
import { Semaphore } from "../../../Semaphore"
import { Ref } from "../../definition"
import type { SynchronizedRef } from "../definition"
import { SynchronizedRefInternal } from "./_internal/SynchronizedRefInternal"

/**
 * Creates a new `Ref.Synchronized` with the specified value.
 *
 * @tsplus static ets/Ref/SynchronizedOps make
 */
export function make<A>(
  value: LazyArg<A>,
  __tsplusTrace?: string
): Effect<unknown, never, SynchronizedRef<A>> {
  return Effect.Do()
    .bind("ref", () => Ref.make<A>(value))
    .bind("semaphore", () => Semaphore.make(1))
    .map(({ ref, semaphore }) => new SynchronizedRefInternal(ref, semaphore))
}
