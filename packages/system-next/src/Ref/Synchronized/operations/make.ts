import { pipe } from "../../../Function"
import * as Semaphore from "../../../Semaphore"
import * as Ref from "../../operations"
import type { Synchronized } from "../definition"
import { XSynchronized } from "../definition"
import * as T from "./_internal/effect"

/**
 * Creates a new `ZRef.Synchronized` with the specified value.
 */
export function make<A>(value: A): T.UIO<Synchronized<A>> {
  return pipe(
    T.do,
    T.bind("ref", () => Ref.make<A>(value)),
    T.bind("semaphore", () => Semaphore.make(1)),
    T.map(
      ({ ref, semaphore }) =>
        new XSynchronized(new Set([semaphore]), Ref.get(ref), (a) => Ref.set_(ref, a))
    )
  )
}
