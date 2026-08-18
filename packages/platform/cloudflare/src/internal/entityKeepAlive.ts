/** @internal */
import * as Effect from "effect/Effect"
import * as Latch from "effect/Latch"

export interface EntityKeepAlive {
  readonly update: (enabled: boolean) => Effect.Effect<void>
  readonly await: Effect.Effect<void>
  readonly holderCount: () => number
}

/** @internal */
export const makeEntityKeepAlive = (startHold: () => Promise<void>): EntityKeepAlive => {
  const latch = Latch.makeUnsafe(true)
  let holders = 0
  let generation = 0

  const update = (enabled: boolean): Effect.Effect<void> =>
    Effect.sync(() => {
      if (enabled) {
        holders++
        if (holders !== 1) return
        latch.closeUnsafe()
        const currentGeneration = ++generation
        void startHold().catch(() => {
          if (currentGeneration !== generation) return
          holders = 0
          latch.openUnsafe()
        })
        return
      }
      if (holders === 0) return
      holders--
      if (holders !== 0) return
      generation++
      latch.openUnsafe()
    })

  return {
    update,
    await: latch.await,
    holderCount: () => holders
  }
}
