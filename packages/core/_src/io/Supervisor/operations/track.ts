/**
 * Creates a new supervisor that tracks children in a set.
 *
 * @tsplus static ets/Supervisor/Ops track
 */
export function track(
  __tsplusTrace?: string
): Effect<never, never, Supervisor<Chunk<Fiber.Runtime<any, any>>>> {
  return Effect.succeed(unsafeTrack)
}

// `setInterval` is limited to take delays which are 32-bit values
const MAX_SET_INTERVAL_VALUE = 2 ** 31 - 1

/**
 * @tsplus static ets/Supervisor/Ops unsafeTrack
 */
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
              // Keep the process alive
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
          clearInterval(ci as any)
        }
      }
    }
  )
}
