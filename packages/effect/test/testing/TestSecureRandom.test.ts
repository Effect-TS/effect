import { assert, describe, it } from "@effect/vitest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import { TestSecureRandom } from "effect/testing"

describe("TestSecureRandom", () => {
  it.effect("provides deterministic random operations from a seed", () => {
    const generate = (seed: string) =>
      Effect.gen(function*() {
        const bytes = yield* SecureRandom.randomBytes(8)
        const random = yield* SecureRandom.random
        const uuid1 = yield* SecureRandom.randomUUIDv4()
        const uuid2 = yield* SecureRandom.randomUUIDv4()
        return { bytes, random, uuid1, uuid2 }
      }).pipe(Effect.provide(TestSecureRandom.layer(seed)))

    return Effect.gen(function*() {
      const first = yield* generate("stable-seed")
      const second = yield* generate("stable-seed")
      const different = yield* generate("different-seed")

      assert.deepStrictEqual(first, second)
      assert.notDeepEqual(first, different)
      assert.notStrictEqual(first.uuid1, first.uuid2)
    })
  })
})
