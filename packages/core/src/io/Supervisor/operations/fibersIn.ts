import * as SS from "../../../collection/immutable/SortedSet"
import type { AtomicReference } from "../../../support/AtomicReference"
import type { UIO } from "../../Effect/definition/base"
import { Effect } from "../../Effect/definition/base"
import type { Fiber } from "../../Fiber"
import { Supervisor } from "../definition"

/**
 * Creates a new supervisor that tracks children in a set.
 *
 * @tsplus static ets/SupervisorOps fibersIn
 */
export function fibersIn(
  ref: AtomicReference<SS.SortedSet<Fiber.Runtime<any, any>>>
): UIO<Supervisor<SS.SortedSet<Fiber.Runtime<any, any>>>> {
  return Effect.succeed(
    new Supervisor(
      Effect.succeed(() => ref.get),
      (_environment, _effect, _parent, fiber) => {
        const set = ref.get
        ref.set(SS.add_(set, fiber))
      },
      (_exit, fiber) => {
        const set = ref.get
        ref.set(SS.remove_(set, fiber))
      }
    )
  )
}
