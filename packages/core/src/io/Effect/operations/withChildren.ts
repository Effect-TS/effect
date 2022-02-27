import type { Chunk } from "../../../collection/immutable/Chunk"
import * as St from "../../../prelude/Structural"
import type { Fiber } from "../../Fiber"
import { Supervisor } from "../../Supervisor"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Locally installs a supervisor and an effect that succeeds with all the
 * children that have been forked in the returned effect.
 *
 * @tsplus static ets/EffectOps withChildren
 */
export function withChildren<R, E, A>(
  get: (children: UIO<Chunk<Fiber.Runtime<any, any>>>) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Supervisor.track().flatMap((supervisor) =>
    get(
      supervisor.value.flatMap((children) =>
        Effect.descriptor.map((descriptor) =>
          // Filter out the fiber id of whoever is calling `withChildren`
          children.filter((_) => St.equals(_.id, descriptor.id))
        )
      )
    ).supervised(supervisor)
  )
}
