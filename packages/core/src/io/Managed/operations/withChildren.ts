import type { Chunk } from "../../../collection/immutable/Chunk"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Fiber } from "../../Fiber"
import { Supervisor } from "../../Supervisor"
import { Managed } from "../definition"

/**
 * Locally installs a supervisor and an effect that succeeds with all the
 * children that have been forked in the returned effect.
 *
 * @tsplus static ets/ManagedOps withChildren
 */
export function withChildren<R, E, A>(
  get: (_: UIO<Chunk<Fiber.Runtime<unknown, unknown>>>) => Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R, E, A> {
  return Managed.unwrap(
    Supervisor.track().map((supervisor) =>
      // Filter out the fiber id of the calling program
      Managed(
        get(
          supervisor.value.flatMap((children) =>
            Effect.descriptor.map((descriptor) =>
              children.filter((fiber) => fiber.id !== descriptor.id)
            )
          )
        ).effect.supervised(supervisor)
      )
    )
  )
}
