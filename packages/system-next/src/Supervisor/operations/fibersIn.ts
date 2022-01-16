// ets_tracing: off

import * as SS from "../../Collections/Immutable/SortedSet"
import type { UIO } from "../../Effect/definition/base"
import { succeed } from "../../Effect/operations/succeed"
import type * as Fiber from "../../Fiber"
import type { AtomicReference } from "../../Support/AtomicReference"
import { Supervisor } from "../definition"

/**
 * Creates a new supervisor that tracks children in a set.
 */
export function fibersIn(
  ref: AtomicReference<SS.SortedSet<Fiber.Runtime<any, any>>>
): UIO<Supervisor<SS.SortedSet<Fiber.Runtime<any, any>>>> {
  return succeed(
    () =>
      new Supervisor(
        succeed(() => ref.get),
        (environment, effect, parent, fiber) => {
          let loop = true
          while (loop) {
            const set = ref.get
            loop = !ref.compareAndSet(set, SS.add_(set, fiber))
          }
        },
        (exit, fiber) => {
          let loop = true
          while (loop) {
            const set = ref.get
            loop = !ref.compareAndSet(set, SS.remove_(set, fiber))
          }
        }
      )
  )
}
