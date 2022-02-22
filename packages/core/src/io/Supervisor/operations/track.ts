import { Chunk } from "../../../collection/immutable/Chunk"
import { AtomicReference } from "../../../support/AtomicReference"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type * as Fiber from "../../Fiber"
import { Supervisor } from "../definition"

// `setInterval` is limited to take delays which are 32-bit values
const MAX_SET_INTERVAL_VALUE = 2 ** 31 - 1

export function unsafeTrack(): Supervisor<Chunk<Fiber.Runtime<any, any>>> {
  const set = new Set<Fiber.Runtime<any, any>>()
  const interval = new AtomicReference<number | undefined>(undefined)

  return new Supervisor(
    Effect.succeed(Chunk.from(set)),
    (_, __, ___, fiber) => {
      if (set.has(fiber)) {
        if (interval.get == null) {
          interval.set(
            // @ts-ignore
            setInterval(() => {
              // keep process alive
            }, MAX_SET_INTERVAL_VALUE)
          )
        }
      } else {
        set.add(fiber)
      }
    },
    (_, fiber) => {
      set.delete(fiber)
      if (set.size === 0) {
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
