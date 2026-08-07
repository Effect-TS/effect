import { describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { NodeStream } from "@effect/platform-node-shared"
import { Readable } from "node:stream"
import { deepStrictEqual } from "node:assert"

describe("NodeStream / duplicate error listener", () => {
  it.effect("toString should register a single error listener", () =>
    Effect.gen(function*() {
      let registrationCount = 0

      const originalOnce = Readable.prototype.once.bind(Readable.prototype)
      Readable.prototype.once = function (event: string, ...args: Array<any>) {
        if (event === "error") registrationCount++
        return originalOnce(event, ...args)
      }

      yield* NodeStream.toString(() => {
        const s = new Readable({
          read() {
            this.destroy(new Error("test"))
          }
        })
        return s
      }).pipe(
        Effect.catchAll(() => Effect.void)
      )

      // Bug: registrationCount is 2 (registered twice at lines 232 and 238)
      // When fixed, this should be: deepStrictEqual(registrationCount, 1)
      deepStrictEqual(registrationCount, 1)
    }))
})
