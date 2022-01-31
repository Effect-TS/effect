import { Effect } from "../../../Effect"
import * as Semaphore from "../../../Semaphore"
import { get as refGet } from "../../operations/get"
import { make as refMake } from "../../operations/make"
import { set_ as refSet_ } from "../../operations/set"
import type { Synchronized } from "../definition"
import { XSynchronized } from "../definition"

/**
 * Creates a new `XRef.Synchronized` with the specified value.
 */
export function make<A>(
  value: A,
  __etsTrace?: string
): Effect<unknown, never, Synchronized<A>> {
  return Effect.Do()
    .bind("ref", () => refMake<A>(value))
    .bind("semaphore", () => Semaphore.make(1))
    .map(
      ({ ref, semaphore }) =>
        new XSynchronized(new Set([semaphore]), refGet(ref), (a) => refSet_(ref, a))
    )
}
