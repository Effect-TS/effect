import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Terminal from "effect/Terminal"

describe("Terminal", () => {
  it.effect("make offers one size snapshot per subscription when size is omitted", () =>
    Effect.gen(function*() {
      let columns = 80
      const terminal = Terminal.make({
        columns: Effect.sync(() => columns),
        rows: Effect.succeed(24),
        readInput: Effect.die("unused"),
        readLine: Effect.die("unused"),
        display: () => Effect.void
      })
      assert.deepStrictEqual(yield* Queue.collect(yield* terminal.size), [{ columns: 80, rows: 24 }])
      columns = 100
      assert.deepStrictEqual(yield* Queue.collect(yield* terminal.size), [{ columns: 100, rows: 24 }])
    }))
})
