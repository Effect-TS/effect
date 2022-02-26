import type { LazyArg } from "../../../../data/Function"
import { Effect } from "../../../Effect"
import * as Semaphore from "../../../Semaphore"
import { Ref } from "../../definition"
import type { Synchronized } from "../definition"
import { XSynchronized } from "../definition"

/**
 * Creates a new `XRef.Synchronized` with the specified value.
 *
 * @tsplus static ets/XSynchronizedOps make
 */
export function make<A>(
  value: LazyArg<A>,
  __tsplusTrace?: string
): Effect<unknown, never, Synchronized<A>> {
  return Effect.Do()
    .bind("ref", () => Ref.make<A>(value))
    .bind("semaphore", () => Semaphore.make(1))
    .map(
      ({ ref, semaphore }) =>
        new XSynchronized(new Set([semaphore]), ref.get(), (a) => ref.set(a))
    )
}
