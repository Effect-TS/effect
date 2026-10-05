import { assert, it } from "@effect/vitest"
import * as Channel from "effect/Channel"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"

// packages/effect/src/Channel.ts:473 (asyncQueue) forks the registration effect returned to
// Channel.callback (Channel.ts:505) without observing its Exit. The signature exposes the
// registration effect's `E` on the resulting Channel, so a failing registration must fail the channel.
it.live("Channel.callback fails when its registration effect fails", () =>
  Effect.gen(function*() {
    const exit = yield* Channel.callback(() => Effect.fail("setup failed")).pipe(
      Channel.runDrain,
      Effect.timeout("500 millis"),
      Effect.exit
    )
    assert.deepStrictEqual(exit, Exit.fail("setup failed"))
  }))
