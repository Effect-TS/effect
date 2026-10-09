import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type * as PlatformError from "effect/PlatformError"
import * as TestClock from "effect/testing/TestClock"

const backend = { subtle: globalThis.crypto.subtle }

const testCrypto = Crypto.make({
  ...backend,
  randomBytes: (size) =>
    size % 7 === 0
      ? Uint8Array.from({ length: size }, (_, i) => i % 7 === 0 ? 0x18 : 0)
      : Uint8Array.from({ length: size }, (_, i) => i),
  digest: (algorithm, data) => Effect.succeed(Uint8Array.of(data.length, algorithm.length))
})

// Serves one 53-bit draw per 7 random bytes, repeating the last value.
const makeCrypto = (...values: ReadonlyArray<bigint>) => {
  let index = 0
  return Crypto.make({
    ...backend,
    randomBytes: (size) => {
      const bytes = new Uint8Array(size)
      for (let offset = 0; offset < size; offset += 7) {
        const value = values[Math.min(index++, values.length - 1)]
        for (let i = 0; i < 7 && offset + i < size; i++) {
          bytes[offset + i] = Number((value >> BigInt(48 - 8 * i)) & (i === 0 ? 0x3fn : 0xffn))
        }
      }
      return bytes
    },
    digest: (_algorithm, data) => Effect.succeed(data)
  })
}

const assertRangeError = <A>(exit: Exit.Exit<A>) => {
  assert.ok(Exit.isFailure(exit))
  const reason = exit.cause.reasons[0]
  assert.ok(Cause.isDieReason(reason))
  assert.instanceOf(reason.defect, RangeError)
}

describe("Crypto", () => {
  it("uses the module path for its type ID", () => {
    assert.strictEqual(
      (testCrypto as unknown as Record<string, unknown>)["~effect/Crypto"],
      "~effect/Crypto"
    )
  })

  it("supports string literal digest algorithms", () => {
    const algorithm: Crypto.DigestAlgorithm = "SHA-256"
    assert.strictEqual(algorithm, "SHA-256")
  })

  it.effect("randomBytes delegates to the service", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const bytes = yield* crypto.randomBytes(4)
      assert.deepStrictEqual(bytes, Uint8Array.of(0, 1, 2, 3))
    }).pipe(Effect.provideService(Crypto.Crypto, testCrypto)))

  it.effect("random generators delegate to the service", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
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
    }).pipe(Effect.provideService(Crypto.Crypto, testCrypto)))

  it.effect("randomBetween excludes the upper bound when the result rounds up", () =>
    Effect.gen(function*() {
      const value = yield* makeCrypto((1n << 53n) - 2n).randomBetween(10, 20)

      assert.isAtLeast(value, 10)
      assert.isBelow(value, 20)
      assert.strictEqual(value, 20 - 2 ** -48)
    }))

  it("maps adjacent random values to adjacent safe integers", () => {
    assert.strictEqual(makeCrypto(0n).nextIntUnsafe(), Number.MIN_SAFE_INTEGER)
    assert.strictEqual(makeCrypto(1n).nextIntUnsafe(), Number.MIN_SAFE_INTEGER + 1)
    assert.strictEqual(makeCrypto(1n << 53n).nextIntUnsafe(), 1)
    assert.strictEqual(makeCrypto((1n << 54n) - 2n).nextIntUnsafe(), Number.MAX_SAFE_INTEGER)
  })

  it.effect("randomIntBetween excludes the upper bound in half-open ranges", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const value = yield* crypto.randomIntBetween(1, 6, { halfOpen: true })
      assert.strictEqual(value, 5)
    }).pipe(Effect.provideService(Crypto.Crypto, makeCrypto((1n << 53n) - 3n))))

  it.effect("randomUUIDv4 formats UUID bytes from randomBytes", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const uuid = yield* crypto.randomUUIDv4()
      assert.strictEqual(uuid, "00010203-0405-4607-8809-0a0b0c0d0e0f")
      const hex = yield* crypto.randomUUIDv4({ format: "hex" })
      assert.strictEqual(hex, "00010203-0405-4607-8809-0a0b0c0d0e0f")
    }).pipe(Effect.provideService(Crypto.Crypto, testCrypto)))

  it.effect("randomUUIDv7 formats UUID bytes with the Clock timestamp", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const crypto = yield* Crypto.Crypto
      const uuid = yield* crypto.randomUUIDv7()
      assert.strictEqual(uuid, "01234567-89ab-7607-8809-0a0b0c0d0e0f")
      const hex = yield* crypto.randomUUIDv7({ format: "hex" })
      assert.strictEqual(hex, "01234567-89ab-7607-8809-0a0b0c0d0e0f")
    }).pipe(Effect.provideService(Crypto.Crypto, testCrypto)))

  it.effect("randomUUIDv4 returns 16 bytes with the version and variant bits set", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const bytes = yield* crypto.randomUUIDv4({ format: "bytes" })
      assert.deepStrictEqual(bytes, Uint8Array.of(0, 1, 2, 3, 4, 5, 0x46, 7, 0x88, 9, 10, 11, 12, 13, 14, 15))
    }).pipe(Effect.provideService(Crypto.Crypto, testCrypto)))

  it.effect("randomUUIDv7 returns 16 bytes containing the Clock timestamp, version and variant", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const crypto = yield* Crypto.Crypto
      const bytes = yield* crypto.randomUUIDv7({ format: "bytes" })
      assert.deepStrictEqual(
        bytes,
        Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0x76, 7, 0x88, 9, 10, 11, 12, 13, 14, 15)
      )
    }).pipe(Effect.provideService(Crypto.Crypto, testCrypto)))

  it.effect("randomULID encodes the Clock timestamp and random bytes", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const crypto = yield* Crypto.Crypto
      const ulid = yield* crypto.randomULID

      assert.strictEqual(ulid, "014D2PF2DB000G40R40M30E209")
    }).pipe(Effect.provideService(Crypto.Crypto, testCrypto)))

  it.effect("randomULID clamps an overflowing Clock timestamp", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(2 ** 48)
      const crypto = yield* Crypto.Crypto
      const ulid = yield* crypto.randomULID

      assert.strictEqual(ulid, "7ZZZZZZZZZ000G40R40M30E209")
    }).pipe(Effect.provideService(Crypto.Crypto, testCrypto)))

  it.effect("digest delegates to the service", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const digest = yield* crypto.digest("SHA-256", Uint8Array.of(1, 2, 3))
      assert.deepStrictEqual(digest, Uint8Array.of(3, "SHA-256".length))
    }).pipe(Effect.provideService(Crypto.Crypto, testCrypto)))

  it.effect("can access a provided custom Crypto service", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const bytes = yield* crypto.randomBytes(1)
      assert.deepStrictEqual(bytes, Uint8Array.of(0))
    }).pipe(Effect.provideService(Crypto.Crypto, testCrypto)))

  it.effect("splits randomBoolean outcomes at the midpoint", () =>
    Effect.gen(function*() {
      assert.isFalse(yield* makeCrypto((1n << 52n) - 1n).randomBoolean)
      assert.isTrue(yield* makeCrypto(1n << 52n).randomBoolean)
    }))

  it.effect("randomBetween handles finite bounds whose difference overflows", () =>
    Effect.gen(function*() {
      const crypto = makeCrypto(1n << 52n)
      assert.strictEqual(yield* crypto.randomBetween(-Number.MAX_VALUE, Number.MAX_VALUE), 0)
    }))

  it.effect("randomIntBetween uses equal buckets and rejects draws from the incomplete last bucket", () =>
    Effect.gen(function*() {
      const bucket = (1n << 53n) / 3n
      assert.strictEqual(yield* makeCrypto(bucket - 1n).randomIntBetween(1, 3), 1)
      assert.strictEqual(yield* makeCrypto(bucket).randomIntBetween(1, 3), 2)
      assert.strictEqual(yield* makeCrypto(3n * bucket, 0n).randomIntBetween(1, 3), 1)
    }))

  it.effect("randomIntBetween keeps adjacent integers distinct in ranges wider than 53 bits", () =>
    Effect.gen(function*() {
      const min = Number.MIN_SAFE_INTEGER
      const max = Number.MAX_SAFE_INTEGER
      assert.strictEqual(yield* makeCrypto(0n).randomIntBetween(min, max), min)
      assert.strictEqual(yield* makeCrypto(1n).randomIntBetween(min, max), min + 1)
      assert.strictEqual(yield* makeCrypto((1n << 54n) - 2n).randomIntBetween(min, max), max)
    }))

  it.effect("randomIntBetween dies with RangeError for empty or unsafe ranges", () =>
    Effect.gen(function*() {
      const crypto = makeCrypto(0n)
      assert.strictEqual(yield* crypto.randomIntBetween(1.2, 3.9), 2)
      assertRangeError(yield* Effect.exit(crypto.randomIntBetween(1.1, 1.9)))
      assertRangeError(yield* Effect.exit(crypto.randomIntBetween(2, 2, { halfOpen: true })))
      assertRangeError(yield* Effect.exit(crypto.randomIntBetween(0, Infinity)))
    }))

  it.effect("randomShuffle uses rejection sampling and leaves the input unchanged", () =>
    Effect.gen(function*() {
      const input = [1, 2, 3]
      const crypto = makeCrypto((1n << 53n) - 1n, 0n)
      assert.deepStrictEqual(yield* crypto.randomShuffle(input), [2, 3, 1])
      assert.deepStrictEqual(input, [1, 2, 3])
    }))

  it.effect("reports random source failures as PlatformError", () =>
    Effect.gen(function*() {
      const cause = new Error("CSPRNG unavailable")
      const crypto = Crypto.make({
        ...backend,
        randomBytes: () => {
          throw cause
        }
      })
      for (
        const [method, operation] of [
          ["randomBytes", crypto.randomBytes(1)],
          ["randomUUIDv4", crypto.randomUUIDv4()],
          ["randomUUIDv7", crypto.randomUUIDv7()],
          ["randomULID", crypto.randomULID]
        ] as const
      ) {
        const error = yield* Effect.flip<unknown, PlatformError.PlatformError, never>(operation)
        assert.strictEqual(error.reason.method, method)
        assert.strictEqual(error.reason.cause, cause)
      }
    }))

  it.effect("rejects invalid arguments before calling the backend", () =>
    Effect.gen(function*() {
      const unreachable = () => {
        throw new Error("invalid arguments reached the backend")
      }
      const crypto = Crypto.make({
        subtle: new Proxy({} as SubtleCrypto, { get: unreachable }),
        randomBytes: unreachable
      })
      const bytes = new Uint8Array(16)
      const key = yield* Crypto.generateSecretKey({ name: "AES-GCM", length: 128 }).pipe(
        Effect.provideService(Crypto.Crypto, testCrypto)
      )
      const argon2id = { password: bytes, salt: bytes, memoryKiB: 64, passes: 1, parallelism: 1, length: 32 }
      for (
        const [method, operation] of [
          ["randomBytes", crypto.randomBytes(-1)],
          ["pbkdf2", crypto.pbkdf2({ hash: "SHA-256", password: bytes, salt: bytes, iterations: 0, length: 32 })],
          ["pbkdf2", crypto.pbkdf2({ hash: "SHA-256", password: bytes, salt: bytes, iterations: 2 ** 31, length: 32 })],
          ["hkdf", crypto.hkdf({ hash: "SHA-256", key: bytes, length: 255 * 32 + 1 })],
          ["argon2id", crypto.argon2id({ ...argon2id, salt: new Uint8Array(7) })],
          ["argon2id", crypto.argon2id({ ...argon2id, memoryKiB: 7 })],
          ["xchacha20poly1305Encrypt", crypto.xchacha20poly1305Encrypt({ key: bytes, nonce: bytes, data: bytes })],
          ["generateKeyPair", crypto.generateKeyPair({ name: "RSA-PSS", hash: "SHA-256", modulusLength: 1024 })],
          ["encrypt", crypto.encrypt({ name: "AES-GCM", iv: bytes }, key, bytes)],
          ["decrypt", crypto.decrypt({ name: "AES-CTR", counter: bytes, length: 0 }, key, bytes)],
          ["sign", crypto.sign({ name: "RSA-PSS", saltLength: -1 }, key, bytes)],
          ["deriveSharedSecret", crypto.deriveSharedSecret(key, key)]
        ] as const
      ) {
        const error = yield* Effect.flip<unknown, PlatformError.PlatformError, never>(operation)
        assert.strictEqual(error.reason._tag, "BadArgument")
        assert.strictEqual(error.reason.method, method)
      }
    }))

  it.effect("reports operations without a backend as unsupported", () =>
    Effect.gen(function*() {
      const crypto = Crypto.make({ randomBytes: (size) => new Uint8Array(size) })
      const error = yield* Effect.flip(crypto.digest("SHA-256", new Uint8Array()))
      assert.strictEqual(error.reason._tag, "Unsupported")
    }))

  it.effect("rejects keys created by a different backend", () =>
    Effect.gen(function*() {
      const key = yield* testCrypto.generateSecretKey({ name: "AES-GCM", length: 128 })
      const other = Crypto.make({
        subtle: Object.create(globalThis.crypto.subtle),
        randomBytes: (size) => new Uint8Array(size)
      })
      const error = yield* Effect.flip(
        other.encrypt({ name: "AES-GCM", iv: new Uint8Array(12) }, key, new Uint8Array())
      )
      assert.strictEqual(error.reason._tag, "BadArgument")
    }))
})
