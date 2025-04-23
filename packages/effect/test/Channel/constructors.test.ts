import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"

describe("Channel", () => {
  it.effect("succeed", () =>
    Effect.gen(function*() {
      const [chunk, value] = yield* Channel.runCollect(Channel.succeed(1))
      assertTrue(Chunk.isEmpty(chunk))
      strictEqual(value, 1)
    }))

  it.effect("fail", () =>
    Effect.gen(function*() {
      const result = yield* Effect.exit(Channel.runCollect(Channel.fail("uh oh")))
      deepStrictEqual(result, Exit.fail("uh oh"))
    }))
})
