import { Channel, Chunk, Effect, Exit } from "effect"
import * as it from "effect-test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Channel", () => {
  it.effect("succeed", () =>
    Effect.gen(function*($) {
      const [chunk, value] = yield* $(Channel.runCollect(Channel.succeed(1)))
      assert.isTrue(Chunk.isEmpty(chunk))
      assert.strictEqual(value, 1)
    }))

  it.effect("fail", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Channel.runCollect(Channel.fail("uh oh"))))
      assert.deepStrictEqual(result, Exit.fail("uh oh"))
    }))
})
