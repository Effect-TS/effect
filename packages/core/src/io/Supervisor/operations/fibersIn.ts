import * as SS from "../../../collection/immutable/SortedSet"
import type { AtomicReference } from "../../../support/AtomicReference"
import type { UIO } from "../../Effect/definition/base"
import { succeed } from "../../Effect/operations/succeed"
import type { Fiber } from "../../Fiber"
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
          const set = ref.get
          ref.set(SS.add_(set, fiber))
        },
        (exit, fiber) => {
          const set = ref.get
          ref.set(SS.remove_(set, fiber))
        }
      )
  )
}
