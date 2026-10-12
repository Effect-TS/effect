import { assert, describe, it, vi } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Random from "effect/Random"
import * as TestClock from "effect/testing/TestClock"

const testRandom = Crypto.makeSecureRandom((size) =>
  size % 7 === 0
    ? Uint8Array.from({ length: size }, (_, i) => i % 7 === 0 ? 0x18 : 0)
    : Uint8Array.from({ length: size }, (_, i) => i)
)

// Serves one 53-bit draw per 7 random bytes, repeating the last value.
const makeRandom = (...values: ReadonlyArray<bigint>) => {
  let index = 0
  return Crypto.makeSecureRandom((size) => {
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

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
  if (array instanceof Uint8Array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = i & 0xff
    }
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

const assertRangeError = <A>(exit: Exit.Exit<A>) => {
  assert.ok(Exit.isFailure(exit))
  const reason = exit.cause.reasons[0]
  assert.ok(Cause.isDieReason(reason))
  assert.instanceOf(reason.defect, RangeError)
}

describe("SecureRandom", () => {
  it("uses the module path for its type ID", () => {
    assert.strictEqual(
      (testRandom as unknown as Record<string, unknown>)["~effect/Crypto/SecureRandom"],
      "~effect/Crypto/SecureRandom"
    )
  })

  it.effect("can replace the default Random service", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* Random.next, 0.75)
    }).pipe(Effect.provideService(Random.Random, testRandom)))

  it.effect("randomBytes delegates to the service", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.SecureRandom
      const bytes = yield* crypto.randomBytes(4)
      assert.deepStrictEqual(bytes, Uint8Array.of(0, 1, 2, 3))
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

  it.effect("random generators delegate to the service", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.SecureRandom
      const random = yield* crypto.random
      const randomInt = yield* crypto.randomInt
      const randomBoolean = yield* crypto.randomBoolean
      const randomBetween = yield* crypto.randomBetween(10, 20)
      const randomBetweenDecimalBounds = yield* crypto.randomBetween(10.5, 20.5)
      const randomIntBetween = yield* crypto.randomIntBetween(1, 6)
      const randomShuffle = yield* crypto.randomShuffle([1, 2, 3])

      assert.strictEqual(random, 0.75)
      assert.strictEqual(randomInt, -2251799813685247)
      assert.strictEqual(randomBoolean, true)
      assert.strictEqual(randomBetween, 17.5)
      assert.strictEqual(randomBetweenDecimalBounds, 18)
      assert.strictEqual(randomIntBetween, 5)
      assert.deepStrictEqual(randomShuffle, [1, 2, 3])
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

  it.effect("randomBetween excludes the upper bound when the result rounds up", () =>
    Effect.gen(function*() {
      const value = yield* makeRandom((1n << 53n) - 2n).randomBetween(10, 20)

      assert.isAtLeast(value, 10)
      assert.isBelow(value, 20)
      assert.strictEqual(value, 20 - 2 ** -48)
    }))

  it("maps adjacent random values to adjacent safe integers", () => {
    assert.strictEqual(makeRandom(0n).nextIntUnsafe(), Number.MIN_SAFE_INTEGER)
    assert.strictEqual(makeRandom(1n).nextIntUnsafe(), Number.MIN_SAFE_INTEGER + 1)
    assert.strictEqual(makeRandom(1n << 53n).nextIntUnsafe(), 1)
    assert.strictEqual(makeRandom((1n << 54n) - 2n).nextIntUnsafe(), Number.MAX_SAFE_INTEGER)
  })

  it.effect("randomIntBetween excludes the upper bound in half-open ranges", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.SecureRandom
      const value = yield* crypto.randomIntBetween(1, 6, { halfOpen: true })
      assert.strictEqual(value, 5)
    }).pipe(Effect.provideService(Crypto.SecureRandom, makeRandom((1n << 53n) - 3n))))

  it.effect("randomUUIDv4 formats UUID bytes from randomBytes", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.SecureRandom
      const uuid = yield* crypto.randomUUIDv4()
      assert.strictEqual(uuid, "00010203-0405-4607-8809-0a0b0c0d0e0f")
      const hex = yield* crypto.randomUUIDv4({ format: "hex" })
      assert.strictEqual(hex, "00010203-0405-4607-8809-0a0b0c0d0e0f")
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

  it.effect("randomUUIDv7 formats UUID bytes with the Clock timestamp", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const crypto = yield* Crypto.SecureRandom
      const uuid = yield* crypto.randomUUIDv7()
      assert.strictEqual(uuid, "01234567-89ab-7607-8809-0a0b0c0d0e0f")
      const hex = yield* crypto.randomUUIDv7({ format: "hex" })
      assert.strictEqual(hex, "01234567-89ab-7607-8809-0a0b0c0d0e0f")
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

  it.effect("randomUUIDv4 returns 16 bytes with the version and variant bits set", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.SecureRandom
      const bytes = yield* crypto.randomUUIDv4({ format: "bytes" })
      assert.deepStrictEqual(bytes, Uint8Array.of(0, 1, 2, 3, 4, 5, 0x46, 7, 0x88, 9, 10, 11, 12, 13, 14, 15))
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

  it.effect("randomUUIDv7 returns 16 bytes containing the Clock timestamp, version and variant", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const crypto = yield* Crypto.SecureRandom
      const bytes = yield* crypto.randomUUIDv7({ format: "bytes" })
      assert.deepStrictEqual(
        bytes,
        Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0x76, 7, 0x88, 9, 10, 11, 12, 13, 14, 15)
      )
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

  it.effect("randomULID encodes the Clock timestamp and random bytes", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const crypto = yield* Crypto.SecureRandom
      const ulid = yield* crypto.randomULID

      assert.strictEqual(ulid, "014D2PF2DB000G40R40M30E209")
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

  it.effect("randomULID clamps an overflowing Clock timestamp", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(2 ** 48)
      const crypto = yield* Crypto.SecureRandom
      const ulid = yield* crypto.randomULID

      assert.strictEqual(ulid, "7ZZZZZZZZZ000G40R40M30E209")
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

  it.effect("can access a provided custom SecureRandom service", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.SecureRandom
      const bytes = yield* crypto.randomBytes(1)
      assert.deepStrictEqual(bytes, Uint8Array.of(0))
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

  it.effect("splits randomBoolean outcomes at the midpoint", () =>
    Effect.gen(function*() {
      assert.isFalse(yield* makeRandom((1n << 52n) - 1n).randomBoolean)
      assert.isTrue(yield* makeRandom(1n << 52n).randomBoolean)
    }))

  it.effect("randomBetween handles finite bounds whose difference overflows", () =>
    Effect.gen(function*() {
      const crypto = makeRandom(1n << 52n)
      assert.strictEqual(yield* crypto.randomBetween(-Number.MAX_VALUE, Number.MAX_VALUE), 0)
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
      const crypto = makeRandom(0n)
      assert.strictEqual(yield* crypto.randomIntBetween(1.2, 3.9), 2)
      assertRangeError(yield* Effect.exit(crypto.randomIntBetween(1.1, 1.9)))
      assertRangeError(yield* Effect.exit(crypto.randomIntBetween(2, 2, { halfOpen: true })))
      assertRangeError(yield* Effect.exit(crypto.randomIntBetween(0, Infinity)))
    }))

  it.effect("randomShuffle uses rejection sampling and leaves the input unchanged", () =>
    Effect.gen(function*() {
      const input = [1, 2, 3]
      const crypto = makeRandom((1n << 53n) - 1n, 0n)
      assert.deepStrictEqual(yield* crypto.randomShuffle(input), [2, 3, 1])
      assert.deepStrictEqual(input, [1, 2, 3])
    }))

  it.effect("reports random source failures as CryptoError", () =>
    Effect.gen(function*() {
      const cause = new Error("CSPRNG unavailable")
      const crypto = Crypto.makeSecureRandom(() => {
        throw cause
      })
      for (
        const [method, operation] of [
          ["randomBytes", crypto.randomBytes(1)],
          ["randomUUIDv4", crypto.randomUUIDv4()],
          ["randomUUIDv7", crypto.randomUUIDv7()],
          ["randomULID", crypto.randomULID]
        ] as const
      ) {
        const error = yield* Effect.flip<unknown, Crypto.CryptoError, never>(operation)
        assert.strictEqual(error.algorithm, "SecureRandom")
        assert.strictEqual(error.method, method)
        assert.strictEqual(error.reason._tag, "Unknown")
        assert.strictEqual(error.reason.cause, cause)
      }
    }))

  it.effect("rejects invalid sizes before calling the byte source", () =>
    Effect.gen(function*() {
      const crypto = Crypto.makeSecureRandom(() => {
        throw new Error("invalid sizes reached the byte source")
      })
      for (const size of [-1, 1.5, Number.NaN]) {
        const error = yield* Effect.flip(crypto.randomBytes(size))
        assert.strictEqual(error.reason._tag, "BadArgument")
      }
    }))
})

describe("Crypto.layerSecureRandom", () => {
  it.effect("generates random bytes at and above the getRandomValues limit", () => {
    const chunks: Array<number> = []
    return Effect.gen(function*() {
      for (const size of [65_536, 65_537, 70_000]) {
        const bytes = yield* Crypto.randomBytes(size)
        assert.strictEqual(bytes.length, size)
        assert.strictEqual(bytes[0], 0)
        assert.strictEqual(bytes[size - 1], (size - 1) & 0xff)
      }
      assert.deepStrictEqual(chunks, [65_536, 65_536, 1, 65_536, 4_464])
    }).pipe(
      Effect.provide(Crypto.layerSecureRandom),
      withGlobalCrypto({
        getRandomValues<T extends ArrayBufferView | null>(array: T): T {
          if (array !== null) {
            assert.ok(array.byteLength <= 65_536)
            chunks.push(array.byteLength)
          }
          return getRandomValues(array)
        }
      })
    )
  })

  it.effect("generates UUIDv4 values from getRandomValues", () =>
    Effect.gen(function*() {
      const uuid = yield* Crypto.randomUUIDv4()
      assert.strictEqual(uuid, "00010203-0405-4607-8809-0a0b0c0d0e0f")
      assert.match(uuid, uuidV4Regex)
    }).pipe(Effect.provide(Crypto.layerSecureRandom), withGlobalCrypto({ getRandomValues })))

  it.effect("generates UUIDv7 values from getRandomValues and the Clock", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const uuid = yield* Crypto.randomUUIDv7()
      assert.strictEqual(uuid, "01234567-89ab-7607-8809-0a0b0c0d0e0f")
      assert.match(uuid, uuidV7Regex)
    }).pipe(Effect.provide(Crypto.layerSecureRandom), withGlobalCrypto({ getRandomValues })))

  it.effect("needs only getRandomValues, not crypto.subtle", () =>
    Effect.gen(function*() {
      assert.strictEqual((yield* Crypto.randomBytes(8)).length, 8)
    }).pipe(Effect.provide(Crypto.layerSecureRandom), withGlobalCrypto({ getRandomValues, subtle: undefined })))

  it.effect("dies when the runtime has no global Web Crypto object", () =>
    Effect.gen(function*() {
      const exit = yield* Effect.exit(Layer.build(Crypto.layerSecureRandom))
      assert.ok(Exit.isFailure(exit))
      const reason = exit.cause.reasons[0]
      assert.ok(Cause.isDieReason(reason))
      assert.ok(reason.defect instanceof Error)
      assert.strictEqual(reason.defect.message, "Web Crypto API is not available")
    }).pipe(withGlobalCrypto(undefined)))
})
