import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { TestCrypto } from "effect/testing"

describe("TestCrypto", () => {
  it.effect.each(["make", "layer"] as const)("restarts the sequence on independent %s builds", (api) => {
    const baseCrypto = Crypto.make({
      randomBytes: () => {
        throw new Error("base randomBytes should not be called")
      },
      digest: (_algorithm, data) => Effect.succeed(data)
    })
    const read = Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      return yield* Effect.all([crypto.randomBytes(4), crypto.randomBytes(4)])
    })
    const build = (api === "make"
      ? TestCrypto.make("my-seed").pipe(
        Effect.flatMap((crypto) => read.pipe(Effect.provideService(Crypto.Crypto, crypto)))
      )
      : read.pipe(Effect.provide(TestCrypto.layer("my-seed")))).pipe(
        Effect.provideService(Crypto.Crypto, baseCrypto)
      )

    return Effect.gen(function*() {
      const first = yield* build
      const second = yield* build

      assert.notDeepEqual(first[0], first[1])
      assert.deepStrictEqual(second, first)
    })
  })

  it.effect("provides deterministic random operations and delegates digests", () => {
    const baseCrypto = Crypto.make({
      randomBytes: () => {
        throw new Error("base randomBytes should not be called")
      },
      digest: (algorithm, data) => Effect.succeed(Uint8Array.of(algorithm.length, data.length))
    })
    const generate = (seed: string) =>
      Effect.gen(function*() {
        const crypto = yield* Crypto.Crypto
        const bytes = yield* crypto.randomBytes(8)
        const random = yield* crypto.random
        const uuid1 = yield* crypto.randomUUIDv4()
        const uuid2 = yield* crypto.randomUUIDv4()
        const digest = yield* crypto.digest("SHA-256", bytes)
        return { bytes, digest, random, uuid1, uuid2 }
      }).pipe(
        Effect.provide(
          TestCrypto.layer(seed).pipe(
            Layer.provide(Layer.succeed(Crypto.Crypto, baseCrypto))
          )
        )
      )

    return Effect.gen(function*() {
      const first = yield* generate("stable-seed")
      const second = yield* generate("stable-seed")
      const different = yield* generate("different-seed")

      assert.deepStrictEqual(first, second)
      assert.notDeepEqual(first, different)
      assert.notStrictEqual(first.uuid1, first.uuid2)
      assert.deepStrictEqual(first.digest, Uint8Array.of("SHA-256".length, 8))
    })
  })
})
