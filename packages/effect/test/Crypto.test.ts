import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as PlatformError from "effect/PlatformError"
import * as TestClock from "effect/testing/TestClock"

const primitives: Omit<Parameters<typeof Crypto.make>[0], "randomBytes"> = {
  ...Crypto.makeSubtle({} as SubtleCrypto),
  hmac: (_algorithm, _key, data) => Effect.succeed(data),
  pbkdf2: (_algorithm, _password, _salt, _iterations, length) => Effect.succeed(new Uint8Array(length)),
  rsaOaepEncrypt: ({ data }) => Effect.succeed(data)
}

const testCrypto = Crypto.make({
  ...primitives,
  randomBytes: (size) =>
    size === 7 ? Uint8Array.of(0x18, 0, 0, 0, 0, 0, 0) : Uint8Array.from({ length: size }, (_, i) => i),
  digest: (algorithm, data) => Effect.succeed(Uint8Array.of(data.length, algorithm.length))
})

const makeCrypto = (value: bigint) =>
  Crypto.make({
    ...primitives,
    randomBytes: () =>
      Uint8Array.of(
        Number((value >> 48n) & 0x3fn),
        Number((value >> 40n) & 0xffn),
        Number((value >> 32n) & 0xffn),
        Number((value >> 24n) & 0xffn),
        Number((value >> 16n) & 0xffn),
        Number((value >> 8n) & 0xffn),
        Number(value & 0xffn)
      ),
    digest: (_algorithm, data) => Effect.succeed(data)
  })

const makeSequence = (values: ReadonlyArray<bigint>) => {
  let index = 0
  return Crypto.make({
    ...primitives,
    randomBytes: (size) => {
      assert.strictEqual(size, 7)
      assert.isBelow(index, values.length, "Consumed more random draws than expected")
      const value = values[index++]
      return Uint8Array.of(
        Number((value >> 48n) & 0x3fn),
        Number((value >> 40n) & 0xffn),
        Number((value >> 32n) & 0xffn),
        Number((value >> 24n) & 0xffn),
        Number((value >> 16n) & 0xffn),
        Number((value >> 8n) & 0xffn),
        Number(value & 0xffn)
      )
    },
    digest: (_algorithm, data) => Effect.succeed(data)
  })
}

describe("Crypto", () => {
  it.effect("exposes every service operation through public helpers", () =>
    Effect.gen(function*() {
      const bytes = yield* Crypto.randomBytes(4)
      assert.deepStrictEqual(bytes, Uint8Array.of(0, 1, 2, 3))
      assert.deepStrictEqual(yield* Crypto.digest("SHA-256", bytes), Uint8Array.of(4, 7))
      assert.strictEqual(yield* Crypto.random, 0.75)
      assert.strictEqual(yield* Crypto.randomBoolean, true)
      assert.strictEqual(yield* Crypto.randomInt, -2251799813685247)
      assert.strictEqual(yield* Crypto.randomBetween(10, 20), 17.5)
      assert.strictEqual(yield* Crypto.randomIntBetween(1, 6), 5)
      assert.deepStrictEqual(yield* Crypto.randomShuffle(new Set([1, 2, 3])), [1, 2, 3])
      assert.strictEqual(yield* Crypto.randomUUIDv4(), "00010203-0405-4607-8809-0a0b0c0d0e0f")
      yield* TestClock.setTime(0x0123456789ab)
      assert.strictEqual(yield* Crypto.randomUUIDv7(), "01234567-89ab-7607-8809-0a0b0c0d0e0f")
      assert.strictEqual(yield* Crypto.randomULID, "014D2PF2DB000G40R40M30E209")
    }).pipe(Effect.provideService(Crypto.Crypto, testCrypto)))

  it.effect("generates fresh bytes on every execution and resolves the current service", () => {
    let calls = 0
    const service = Crypto.make({
      ...primitives,
      randomBytes: (size) => new Uint8Array(size).fill(++calls),
      digest: (_algorithm, data) => Effect.succeed(data)
    })
    const program = Crypto.randomBytes(1)
    assert.strictEqual(calls, 0)
    return Effect.gen(function*() {
      const first = yield* program.pipe(Effect.provideService(Crypto.Crypto, service))
      const second = yield* program.pipe(Effect.provideService(Crypto.Crypto, service))
      assert.deepStrictEqual(first, Uint8Array.of(1))
      assert.deepStrictEqual(second, Uint8Array.of(2))
      assert.notStrictEqual(first, second)
      assert.deepStrictEqual(
        yield* program.pipe(Effect.provideService(Crypto.Crypto, testCrypto)),
        Uint8Array.of(0)
      )
    })
  })

  it.effect("reports random-byte and identifier failures through their declared error channel", () =>
    Effect.gen(function*() {
      const cause = new Error("CSPRNG unavailable")
      for (
        const failure of [cause, PlatformError.systemError({ module: "Crypto", method: "fixture", _tag: "Unknown" })]
      ) {
        const service = Crypto.make({
          ...primitives,
          randomBytes: () => {
            throw failure
          },
          digest: (_algorithm, data) => Effect.succeed(data)
        })
        const operations: ReadonlyArray<
          readonly [
            string,
            Effect.Effect<unknown, PlatformError.PlatformError, Crypto.Crypto>
          ]
        > = [
          ["randomBytes", Crypto.randomBytes(1)],
          ["randomUUIDv4", Crypto.randomUUIDv4()],
          ["randomUUIDv7", Crypto.randomUUIDv7()],
          ["randomULID", Crypto.randomULID]
        ]
        for (const [method, program] of operations) {
          const error = yield* Effect.flip(program.pipe(Effect.provideService(Crypto.Crypto, service)))
          if (failure === cause) {
            assert.strictEqual(error.reason.module, "Crypto")
            assert.strictEqual(error.reason.method, method)
            assert.strictEqual(error.reason._tag, "Unknown")
            assert.strictEqual(error.reason.cause, cause)
          } else {
            assert.strictEqual(error, failure)
          }
        }
        for (const size of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
          const error = yield* Effect.flip(service.randomBytes(size))
          assert.strictEqual(error.reason._tag, "BadArgument")
        }
      }
    }))

  it.effect("splits boolean outcomes exactly at the midpoint", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* makeCrypto((1n << 52n) - 1n).randomBoolean, false)
      assert.strictEqual(yield* makeCrypto(1n << 52n).randomBoolean, true)
    }))

  it.effect("uses equal-sized integer buckets and rejects the incomplete final bucket", () =>
    Effect.gen(function*() {
      const bucketSize = (1n << 53n) / 3n
      for (const [draw, expected] of [[0n, 1], [bucketSize - 1n, 1], [bucketSize, 2], [2n * bucketSize, 3]] as const) {
        assert.strictEqual(yield* makeCrypto(draw).randomIntBetween(1, 3), expected)
      }
      const crypto = makeSequence([3n * bucketSize, 0n])
      assert.strictEqual(yield* crypto.randomIntBetween(1, 3), 1)
    }))

  it.effect("maps draws exactly onto the widest range below 53 bits", () =>
    Effect.gen(function*() {
      const max = Number.MAX_SAFE_INTEGER - 1
      assert.strictEqual(yield* makeCrypto(0n).randomIntBetween(0, max), 0)
      assert.strictEqual(yield* makeCrypto((1n << 53n) - 2n).randomIntBetween(0, max), max)
      const crypto = makeSequence([(1n << 53n) - 1n, 5n])
      assert.strictEqual(yield* crypto.randomIntBetween(0, max), 5)
    }))

  it.effect("preserves adjacent integers throughout ranges wider than 53 bits", () =>
    Effect.gen(function*() {
      for (
        const [draw, expected] of [
          [0n, Number.MIN_SAFE_INTEGER],
          [1n, Number.MIN_SAFE_INTEGER + 1],
          [(1n << 53n) - 1n, 0],
          [1n << 53n, 1],
          [(1n << 54n) - 2n, Number.MAX_SAFE_INTEGER]
        ] as const
      ) {
        assert.strictEqual(
          yield* makeCrypto(draw).randomIntBetween(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
          expected
        )
      }
      const crypto = makeSequence([(1n << 54n) - 1n, 1n << 53n])
      assert.strictEqual(yield* crypto.randomIntBetween(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), 1)
    }))

  it.effect("rounds integer bounds and rejects empty or unsafe ranges", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* makeCrypto(0n).randomIntBetween(1.2, 3.9), 2)
      assert.strictEqual(yield* makeCrypto(0n).randomIntBetween(1.2, 3.9, { halfOpen: true }), 2)
      for (
        const [min, max, halfOpen] of [
          [2, 1, false],
          [2, 2, true],
          [1.1, 1.9, false],
          [NaN, 1, false],
          [0, Infinity, false],
          [Number.MIN_SAFE_INTEGER - 1, 0, false],
          [0, Number.MAX_SAFE_INTEGER + 1, false]
        ] as const
      ) {
        const exit = yield* Effect.exit(makeCrypto(0n).randomIntBetween(min, max, { halfOpen }))
        assert.ok(Exit.isFailure(exit))
        const reason = exit.cause.reasons[0]
        assert.ok(Cause.isDieReason(reason))
        assert.instanceOf(reason.defect, RangeError)
      }
    }))

  it.effect("shuffles with rejection sampling and preserves the input", () =>
    Effect.gen(function*() {
      const input = [1, 2, 3]
      const crypto = makeSequence([(1n << 53n) - 1n, 0n, 0n])
      assert.deepStrictEqual(yield* crypto.randomShuffle(input), [2, 3, 1])
      assert.deepStrictEqual(input, [1, 2, 3])
    }))

  it.effect("handles finite floating-point bounds whose difference overflows", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* makeCrypto(0n).randomBetween(-Number.MAX_VALUE, Number.MAX_VALUE), -Number.MAX_VALUE)
      assert.strictEqual(yield* makeCrypto(1n << 52n).randomBetween(-Number.MAX_VALUE, Number.MAX_VALUE), 0)
      assert.isBelow(
        yield* makeCrypto((1n << 53n) - 1n).randomBetween(-Number.MAX_VALUE, Number.MAX_VALUE),
        Number.MAX_VALUE
      )
    }))
  it.effect("preserves platform failures from all cryptographic operations", () =>
    Effect.gen(function*() {
      const bytes = Uint8Array.of(1)
      const failure = PlatformError.systemError({ module: "Crypto", method: "fixture", _tag: "Unknown" })
      const service = Crypto.make({
        ...primitives,
        randomBytes: (size) => new Uint8Array(size),
        digest: (_algorithm, data) => Effect.succeed(data),
        hmac: () => Effect.fail(failure),
        pbkdf2: () => Effect.fail(failure),
        rsaOaepEncrypt: () => Effect.fail(failure)
      })
      for (
        const operation of [
          Crypto.hmac("SHA-256", bytes, bytes),
          Crypto.pbkdf2("SHA-256", bytes, bytes, 1, 32),
          Crypto.rsaOaepEncrypt({ publicKey: bytes, data: bytes })
        ]
      ) {
        const error = yield* Effect.flip(operation.pipe(Effect.provideService(Crypto.Crypto, service)))
        assert.strictEqual(error, failure)
      }
    }))

  it.effect("delegates primitive arguments and preserves typed failures", () =>
    Effect.gen(function*() {
      const key = Uint8Array.of(1, 2)
      const data = Uint8Array.of(3, 4)
      const salt = Uint8Array.of(5, 6)
      const failure = PlatformError.systemError({ module: "Crypto", method: "fixture", _tag: "Unknown" })
      const crypto = Crypto.make({
        ...primitives,
        randomBytes: (size) => new Uint8Array(size),
        digest: (_algorithm, bytes) => Effect.succeed(bytes),
        hmac: (algorithm, actualKey, actualData) => {
          assert.strictEqual(algorithm, "SHA-384")
          assert.strictEqual(actualKey, key)
          assert.strictEqual(actualData, data)
          return Effect.succeed(data)
        },
        pbkdf2: (algorithm, password, actualSalt, iterations, length) => {
          assert.strictEqual(algorithm, "SHA-512")
          assert.strictEqual(password, key)
          assert.strictEqual(actualSalt, salt)
          assert.strictEqual(iterations, 2)
          assert.strictEqual(length, 64)
          return Effect.fail(failure)
        },
        rsaOaepEncrypt: (options) => {
          assert.strictEqual(options.publicKey, key)
          assert.strictEqual(options.data, data)
          assert.strictEqual(options.label, salt)
          assert.strictEqual(options.hash, "SHA-1")
          return Effect.succeed(data)
        }
      })
      assert.strictEqual(
        yield* Crypto.hmac("SHA-384", key, data).pipe(Effect.provideService(Crypto.Crypto, crypto)),
        data
      )
      assert.strictEqual(
        yield* Effect.flip(
          Crypto.pbkdf2("SHA-512", key, salt, 2, 64).pipe(Effect.provideService(Crypto.Crypto, crypto))
        ),
        failure
      )
      assert.strictEqual(
        yield* Crypto.rsaOaepEncrypt({ publicKey: key, data, label: salt, hash: "SHA-1" }).pipe(
          Effect.provideService(Crypto.Crypto, crypto)
        ),
        data
      )
    }))

  it.effect("rejects invalid PBKDF2 parameters before calling the primitive", () =>
    Effect.gen(function*() {
      const crypto = Crypto.make({
        ...primitives,
        randomBytes: (size) => new Uint8Array(size),
        digest: (_algorithm, data) => Effect.succeed(data),
        pbkdf2: () => {
          throw new Error("Invalid arguments reached the primitive")
        }
      })
      const bytes = new Uint8Array()
      for (const invalid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        for (const [iterations, length] of [[invalid, 32], [1, invalid], [2 ** 32, 32], [1, 2 ** 29]]) {
          const error = yield* Effect.flip(
            Crypto.pbkdf2("SHA-256", bytes, bytes, iterations, length).pipe(
              Effect.provideService(Crypto.Crypto, crypto)
            )
          )
          assert.strictEqual(error.reason._tag, "BadArgument")
          assert.strictEqual(error.reason.method, "pbkdf2")
          assert.strictEqual(error.reason.module, "Crypto")
        }
      }
    }))

  it.effect("reports a missing SubtleCrypto backend as a PlatformError", () =>
    Effect.gen(function*() {
      const subtle = Crypto.makeSubtle(undefined as unknown as SubtleCrypto)
      const error = yield* Effect.flip(subtle.generateSecretKey({ name: "AES-GCM", length: 256 }))
      assert.instanceOf(error.reason, PlatformError.SystemError)
      assert.strictEqual(error.reason.method, "generateSecretKey")
      assert.strictEqual(error.reason.description, "SubtleCrypto is not available")
    }))

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
    }).pipe(Effect.provideService(
      Crypto.Crypto,
      makeCrypto((1n << 53n) - 3n)
    )))

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
})
