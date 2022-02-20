import { Chunk } from "../../../collection/immutable/Chunk"
import { AtomicReference } from "../../../support/AtomicReference"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type * as Fiber from "../../Fiber"
import { Supervisor } from "../definition"

export const mainFibers: Set<Fiber.Runtime<any, any>> = new Set()

export function unsafeTrack(): Supervisor<Chunk<Fiber.Runtime<any, any>>> {
  const interval = new AtomicReference<NodeJS.Timeout | undefined>(undefined)

  return new Supervisor(
    Effect.succeed(() => Chunk.from(mainFibers)),
    (_, __, ___, fiber) => {
      if (mainFibers.has(fiber)) {
        if (typeof interval.get === "undefined") {
          interval.set(
            setInterval(() => {
              // keep process alive
            }, 60000)
          )
        }
      }
    },
    (_, fiber) => {
      mainFibers.delete(fiber)
      if (mainFibers.size === 0) {
        const ci = interval.get

        if (ci) {
          clearInterval(ci)
        }
      }
    }
  )
}

/**
 * Creates a new supervisor that tracks children in a set.
 */
export function track(
  __etsTrace?: string
): UIO<Supervisor<Chunk<Fiber.Runtime<any, any>>>> {
  return Effect.succeed(unsafeTrack)
}
