/** @internal */
import * as Clock from "../../Clock.ts"
import * as Effect from "../../Effect.ts"
import { allocate, BLOCKS_PER_BATCH, destroy, fill, initialize, output, type State } from "./argon2Core.ts"
import type { Argon2, Argon2Parameters } from "./kdf.ts"

/** @internal */
export const derive = Effect.fnUntraced(function*(
  input: Argon2Parameters,
  state: State,
  compress?: Parameters<typeof fill>[2]
) {
  const clock = yield* Clock.Clock

  initialize(state, input)
  const blocks = fill(state, input, compress)

  for (;;) {
    const started = clock.monotonicTimeNanosUnsafe()

    // Workers freeze clocks during CPU work. Cap each slice as well so
    // interruption and other fibers still get a turn on those runtimes.
    for (let processed = 0; processed < 2048; processed += BLOCKS_PER_BATCH) {
      if (blocks.next().done) return output(state, input)
      if (clock.monotonicTimeNanosUnsafe() - started >= BigInt("8000000")) break
    }
    yield* Effect.yieldNow
  }
})

/**
 * Effect schedules time slices; admission remains held through buffer cleanup.
 *
 * @internal
 */
export const argon2: Argon2 = (input) =>
  Effect.acquireUseRelease(
    Effect.sync(() => allocate(input)),
    (state) => derive(input, state),
    (state) => Effect.sync(() => destroy(state))
  )
