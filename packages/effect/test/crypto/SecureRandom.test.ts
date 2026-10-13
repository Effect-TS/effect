import { assert, describe, it, vi } from "@effect/vitest"
import * as Cause from "effect/Cause"
import type * as CryptoError from "effect/crypto/CryptoError"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Random from "effect/Random"
import * as TestClock from "effect/testing/TestClock"
import { assertReason } from "../utils/crypto.ts"

describe("SecureRandom", () => {
  const testRandom = SecureRandom.make((size) =>
    size % 7 === 0
      ? Uint8Array.from({ length: size }, (_, i) => i % 7 === 0 ? 0x18 : 0)
      : Uint8Array.from({ length: size }, (_, i) => i)
  )

  // Serves one 53-bit draw per 7 random bytes, repeating the last value.
  const makeRandom = (...values: ReadonlyArray<bigint>) => {
    let index = 0
    return SecureRandom.make((size) => {
      const bytes = new Uint8Array(size)
      for (let offset = 0; offset < size; offset += 7) {
        const value = values[Math.min(index++, values.length - 1)]
        for (let i = 0; i < 7 && offset + i < size; i++) {
          bytes[offset + i] = Number((value >> BigInt(48 - 8 * i)) & (i === 0 ? 0x3fn : 0xffn))
        }
      }
      return bytes
    })
  }

  const assertRangeError = <A>(exit: Exit.Exit<A>) => {
    assert.ok(Exit.isFailure(exit))
    const reason = exit.cause.reasons[0]
    assert.ok(Cause.isDieReason(reason))
    assert.instanceOf(reason.defect, RangeError)
  }

  it("uses the module path for its type ID", () => {
    assert.strictEqual(
      (testRandom as unknown as Record<string, unknown>)["~effect/crypto/SecureRandom"],
      "~effect/crypto/SecureRandom"
    )
  })

  it.effect("can replace the default Random service", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* Random.next, 0.75)
    }).pipe(Effect.provideService(Random.Random, testRandom)))

  it.effect("randomBytes delegates to the service", () =>
    Effect.gen(function*() {
      assert.deepStrictEqual(yield* SecureRandom.randomBytes(4), Uint8Array.of(0, 1, 2, 3))
    }).pipe(Effect.provideService(SecureRandom.SecureRandom, testRandom)))

  it.effect("random generators delegate to the service", () =>
    Effect.gen(function*() {
      const random = yield* SecureRandom.SecureRandom
      assert.strictEqual(yield* random.random, 0.75)
      assert.strictEqual(yield* random.randomInt, -2251799813685247)
      assert.strictEqual(yield* random.randomBoolean, true)
      assert.strictEqual(yield* random.randomBetween(10, 20), 17.5)
      assert.strictEqual(yield* random.randomBetween(10.5, 20.5), 18)
      assert.strictEqual(yield* random.randomIntBetween(1, 6), 5)
      assert.deepStrictEqual(yield* random.randomShuffle([1, 2, 3]), [1, 2, 3])
    }).pipe(Effect.provideService(SecureRandom.SecureRandom, testRandom)))

  it.effect("randomBetween excludes the upper bound when the result rounds up", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* makeRandom((1n << 53n) - 2n).randomBetween(10, 20), 20 - 2 ** -48)
    }))

  it.effect("randomBetween handles finite bounds whose difference overflows", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* makeRandom(1n << 52n).randomBetween(-Number.MAX_VALUE, Number.MAX_VALUE), 0)
    }))

  it.effect("splits randomBoolean outcomes at the midpoint", () =>
    Effect.gen(function*() {
      assert.isFalse(yield* makeRandom((1n << 52n) - 1n).randomBoolean)
      assert.isTrue(yield* makeRandom(1n << 52n).randomBoolean)
    }))

  it("maps adjacent random values to adjacent safe integers", () => {
    assert.strictEqual(makeRandom(0n).nextIntUnsafe(), Number.MIN_SAFE_INTEGER)
    assert.strictEqual(makeRandom(1n).nextIntUnsafe(), Number.MIN_SAFE_INTEGER + 1)
    assert.strictEqual(makeRandom(1n << 53n).nextIntUnsafe(), 1)
    assert.strictEqual(makeRandom((1n << 54n) - 2n).nextIntUnsafe(), Number.MAX_SAFE_INTEGER)
  })

  it.effect("randomIntBetween excludes the upper bound in half-open ranges", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* makeRandom((1n << 53n) - 3n).randomIntBetween(1, 6, { halfOpen: true }), 5)
    }))

  it.effect("randomIntBetween uses equal buckets and rejects draws from the incomplete last bucket", () =>
    Effect.gen(function*() {
      const bucket = (1n << 53n) / 3n
      assert.strictEqual(yield* makeRandom(bucket - 1n).randomIntBetween(1, 3), 1)
      assert.strictEqual(yield* makeRandom(bucket).randomIntBetween(1, 3), 2)
      assert.strictEqual(yield* makeRandom(3n * bucket, 0n).randomIntBetween(1, 3), 1)
    }))

  it.effect("randomIntBetween keeps adjacent integers distinct in ranges wider than 53 bits", () =>
    Effect.gen(function*() {
      const min = Number.MIN_SAFE_INTEGER
      const max = Number.MAX_SAFE_INTEGER
      assert.strictEqual(yield* makeRandom(0n).randomIntBetween(min, max), min)
      assert.strictEqual(yield* makeRandom(1n).randomIntBetween(min, max), min + 1)
      assert.strictEqual(yield* makeRandom((1n << 54n) - 2n).randomIntBetween(min, max), max)
    }))

  it.effect("randomIntBetween dies with RangeError for empty or unsafe ranges", () =>
    Effect.gen(function*() {
      const random = makeRandom(0n)
      assert.strictEqual(yield* random.randomIntBetween(1.2, 3.9), 2)
      assertRangeError(yield* Effect.exit(random.randomIntBetween(1.1, 1.9)))
      assertRangeError(yield* Effect.exit(random.randomIntBetween(2, 2, { halfOpen: true })))
      assertRangeError(yield* Effect.exit(random.randomIntBetween(0, Infinity)))
    }))

  it.effect("randomShuffle uses rejection sampling and leaves the input unchanged", () =>
    Effect.gen(function*() {
      const input = [1, 2, 3]
      assert.deepStrictEqual(yield* makeRandom((1n << 53n) - 1n, 0n).randomShuffle(input), [2, 3, 1])
      assert.deepStrictEqual(input, [1, 2, 3])
    }))

  it.effect("formats UUIDs and ULIDs from randomBytes and the Clock", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const random = yield* SecureRandom.SecureRandom
      assert.strictEqual(yield* random.randomUUIDv4(), "00010203-0405-4607-8809-0a0b0c0d0e0f")
      assert.strictEqual(yield* random.randomUUIDv4({ format: "hex" }), "00010203-0405-4607-8809-0a0b0c0d0e0f")
      assert.deepStrictEqual(
        yield* random.randomUUIDv4({ format: "bytes" }),
        Uint8Array.of(0, 1, 2, 3, 4, 5, 0x46, 7, 0x88, 9, 10, 11, 12, 13, 14, 15)
      )
      assert.strictEqual(yield* random.randomUUIDv7(), "01234567-89ab-7607-8809-0a0b0c0d0e0f")
      assert.deepStrictEqual(
        yield* random.randomUUIDv7({ format: "bytes" }),
        Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0x76, 7, 0x88, 9, 10, 11, 12, 13, 14, 15)
      )
      assert.strictEqual(yield* random.randomULID, "014D2PF2DB000G40R40M30E209")
      // Timestamps beyond 48 bits are clamped.
      yield* TestClock.setTime(2 ** 48)
      assert.strictEqual(yield* random.randomULID, "7ZZZZZZZZZ000G40R40M30E209")
    }).pipe(Effect.provideService(SecureRandom.SecureRandom, testRandom)))

  it.effect("reports random source failures as CryptoError", () =>
    Effect.gen(function*() {
      const cause = new Error("CSPRNG unavailable")
      const random = SecureRandom.make(() => {
        throw cause
      })
      for (
        const [method, operation] of [
          ["randomBytes", random.randomBytes(1)],
          ["randomUUIDv4", random.randomUUIDv4()],
          ["randomUUIDv7", random.randomUUIDv7()],
          ["randomULID", random.randomULID]
        ] as const
      ) {
        const error = yield* Effect.flip<unknown, CryptoError.CryptoError, never>(operation)
        assert.strictEqual(error.algorithm, "SecureRandom")
        assertReason(error, "Unknown", method)
        assert.strictEqual(error.reason.cause, cause)
      }
    }))

  it.effect("rejects invalid sizes before calling the byte source", () =>
    Effect.gen(function*() {
      const random = SecureRandom.make(() => {
        throw new Error("invalid sizes reached the byte source")
      })
      for (const size of [-1, 1.5, Number.NaN]) {
        assertReason(yield* Effect.flip(random.randomBytes(size)), "BadArgument")
      }
    }))

  describe("layerSecureRandom", () => {
    const getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
      if (array instanceof Uint8Array) {
        for (let i = 0; i < array.length; i++) array[i] = i & 0xff
      }
      return array
    }

    // Replaces the global `crypto` object for the duration of an effect.
    const withGlobalCrypto = (crypto: unknown) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      Effect.acquireUseRelease(
        Effect.sync(() => vi.stubGlobal("crypto", crypto)),
        () => effect,
        () => Effect.sync(() => vi.unstubAllGlobals())
      )

    it.effect("fills requests above the getRandomValues limit in chunks", () => {
      const chunks: Array<number> = []
      return Effect.gen(function*() {
        for (const size of [65_536, 65_537, 70_000]) {
          const bytes = yield* SecureRandom.randomBytes(size)
          assert.strictEqual(bytes.length, size)
          assert.strictEqual(bytes[size - 1], (size - 1) & 0xff)
        }
        assert.deepStrictEqual(chunks, [65_536, 65_536, 1, 65_536, 4_464])
      }).pipe(
        Effect.provide(SecureRandom.layer),
        withGlobalCrypto({
          getRandomValues<T extends ArrayBufferView | null>(array: T): T {
            if (array !== null) chunks.push(array.byteLength)
            return getRandomValues(array)
          }
        })
      )
    })

    it.effect("needs only getRandomValues, not crypto.subtle", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* SecureRandom.randomUUIDv4(), "00010203-0405-4607-8809-0a0b0c0d0e0f")
      }).pipe(Effect.provide(SecureRandom.layer), withGlobalCrypto({ getRandomValues, subtle: undefined })))

    it.effect("fails to build when the runtime has no global Web Crypto object", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(Layer.build(SecureRandom.layer))
        assert.strictEqual(error.algorithm, "SecureRandom")
        assertReason(error, "Unsupported", "layer")
      }).pipe(withGlobalCrypto(undefined)))
  })
})
