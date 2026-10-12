import { assert, describe, it, vi } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Hex from "effect/encoding/Hex"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Random from "effect/Random"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as TestClock from "effect/testing/TestClock"

// The algorithms are Web Crypto's. These tests check what this module adds:
// parameters, result shapes, key conversions, error reasons, and the checks it
// makes before calling Web Crypto.

const encode = (text: string): Uint8Array => new TextEncoder().encode(text)

const bytes = (hex: string): Uint8Array => Result.getOrThrow(Hex.decode(hex))

const assertReason = (
  error: Crypto.CryptoError,
  reason: Crypto.CryptoErrorReason["_tag"],
  method?: string
) => {
  assert.strictEqual(error.reason._tag, reason)
  if (method !== undefined) assert.strictEqual(error.method, method)
}

// An exception as Web Crypto raises it, identified by its name.
const raise = (name: string) => () => Promise.reject(Object.assign(new Error(`${name} from fixture`), { name }))

// A `SubtleCrypto` whose key imports succeed and whose other methods are
// supplied by the test.
const fakeSubtle = (methods: Partial<Record<keyof SubtleCrypto, () => Promise<unknown>>>) =>
  Layer.succeed(
    Crypto.SubtleCrypto,
    { importKey: () => Promise.resolve({}), ...methods } as unknown as SubtleCrypto
  )

// A `SubtleCrypto` that throws on any access, so a test proves that invalid
// arguments are rejected before reaching Web Crypto.
const unreachable = Layer.succeed(
  Crypto.SubtleCrypto,
  new Proxy({} as SubtleCrypto, {
    get: () => {
      throw new Error("invalid arguments reached Web Crypto")
    }
  })
)

// Encodings the conversion functions read but do not write, produced with Web
// Crypto directly.
const privateJwk = (pkcs8: Redacted.Redacted<Uint8Array>, params: RsaHashedImportParams | EcKeyImportParams) =>
  Effect.promise(async () => {
    const subtle = globalThis.crypto.subtle
    const handle = await subtle.importKey("pkcs8", new Uint8Array(Redacted.value(pkcs8)), params, true, ["sign"])
    return await subtle.exportKey("jwk", handle)
  })
const spki = (raw: Uint8Array, params: AlgorithmIdentifier | EcKeyImportParams) =>
  Effect.promise(async () => {
    const subtle = globalThis.crypto.subtle
    return new Uint8Array(
      await subtle.exportKey("spki", await subtle.importKey("raw", new Uint8Array(raw), params, true, []))
    )
  })

// An uncompressed NIST curve point, or a point with another prefix.
const point = (size: number, prefix = 4) => Uint8Array.of(prefix, ...new Uint8Array(2 * size))

describe("CryptoError", () => {
  it("formats its message from the algorithm, method, and reason", () => {
    const error = new Crypto.CryptoError({
      algorithm: "AES-GCM",
      method: "decrypt",
      reason: new Crypto.AuthenticationFailed({ description: "Could not authenticate or decrypt data" })
    })
    assert.strictEqual(error.message, "AES-GCM.decrypt: AuthenticationFailed: Could not authenticate or decrypt data")
    assert.isTrue(Crypto.isCryptoError(error))
    assert.strictEqual(error.cause, error.reason)
  })
})

describe("SecureRandom", () => {
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

  const assertRangeError = <A>(exit: Exit.Exit<A>) => {
    assert.ok(Exit.isFailure(exit))
    const reason = exit.cause.reasons[0]
    assert.ok(Cause.isDieReason(reason))
    assert.instanceOf(reason.defect, RangeError)
  }

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
      assert.deepStrictEqual(yield* Crypto.randomBytes(4), Uint8Array.of(0, 1, 2, 3))
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

  it.effect("random generators delegate to the service", () =>
    Effect.gen(function*() {
      const random = yield* Crypto.SecureRandom
      assert.strictEqual(yield* random.random, 0.75)
      assert.strictEqual(yield* random.randomInt, -2251799813685247)
      assert.strictEqual(yield* random.randomBoolean, true)
      assert.strictEqual(yield* random.randomBetween(10, 20), 17.5)
      assert.strictEqual(yield* random.randomBetween(10.5, 20.5), 18)
      assert.strictEqual(yield* random.randomIntBetween(1, 6), 5)
      assert.deepStrictEqual(yield* random.randomShuffle([1, 2, 3]), [1, 2, 3])
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

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
      const random = yield* Crypto.SecureRandom
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
    }).pipe(Effect.provideService(Crypto.SecureRandom, testRandom)))

  it.effect("reports random source failures as CryptoError", () =>
    Effect.gen(function*() {
      const cause = new Error("CSPRNG unavailable")
      const random = Crypto.makeSecureRandom(() => {
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
        const error = yield* Effect.flip<unknown, Crypto.CryptoError, never>(operation)
        assert.strictEqual(error.algorithm, "SecureRandom")
        assertReason(error, "Unknown", method)
        assert.strictEqual(error.reason.cause, cause)
      }
    }))

  it.effect("rejects invalid sizes before calling the byte source", () =>
    Effect.gen(function*() {
      const random = Crypto.makeSecureRandom(() => {
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
          const bytes = yield* Crypto.randomBytes(size)
          assert.strictEqual(bytes.length, size)
          assert.strictEqual(bytes[size - 1], (size - 1) & 0xff)
        }
        assert.deepStrictEqual(chunks, [65_536, 65_536, 1, 65_536, 4_464])
      }).pipe(
        Effect.provide(Crypto.layerSecureRandom),
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
        assert.strictEqual(yield* Crypto.randomUUIDv4(), "00010203-0405-4607-8809-0a0b0c0d0e0f")
      }).pipe(Effect.provide(Crypto.layerSecureRandom), withGlobalCrypto({ getRandomValues, subtle: undefined })))

    it.effect("dies when the runtime has no global Web Crypto object", () =>
      Effect.gen(function*() {
        const exit = yield* Effect.exit(Layer.build(Crypto.layerSecureRandom))
        assert.ok(Exit.isFailure(exit))
        const reason = exit.cause.reasons[0]
        assert.ok(Cause.isDieReason(reason))
        assert.strictEqual((reason.defect as Error).message, "Web Crypto API is not available")
      }).pipe(withGlobalCrypto(undefined)))
  })
})

describe("Web Crypto", () => {
  it("maps Web Crypto exceptions to reasons", () => {
    for (
      const [name, reason] of [
        ["DataError", "InvalidKey"],
        ["NotSupportedError", "Unsupported"],
        ["InvalidAccessError", "BadArgument"],
        ["SyntaxError", "BadArgument"],
        ["TypeError", "BadArgument"],
        ["OperationError", "Unknown"]
      ] as const
    ) {
      const cause = Object.assign(new Error(name), { name })
      const error = Crypto.webCryptoError("AES-GCM", "encrypt", cause)
      assert.strictEqual(error.algorithm, "AES-GCM")
      assertReason(error, reason, "encrypt")
      assert.strictEqual(error.reason.cause, cause)
    }
    assertReason(Crypto.webCryptoError("SHA-256", "digest", "not an error"), "Unknown")
    assert.isTrue(Crypto.isOperationError(Object.assign(new Error(), { name: "OperationError" })))
    assert.isFalse(Crypto.isOperationError(new Error()))
  })

  it.effect("fails to build the layers when there is no SubtleCrypto", () =>
    Effect.gen(function*() {
      const missing = Layer.succeed(Crypto.SubtleCrypto, undefined)
      const error = yield* Effect.flip(Layer.build(Crypto.layerAes.pipe(Layer.provide(missing))))
      assert.strictEqual(error.algorithm, "WebCrypto")
      assertReason(error, "Unsupported", "subtle")
    }))

  it.effect("runs the layers on the provided SubtleCrypto", () =>
    Effect.gen(function*() {
      assert.deepStrictEqual(yield* (yield* Crypto.Sha2).digest("SHA-256", new Uint8Array()), Uint8Array.of(1, 2, 3))
    }).pipe(
      Effect.provide(
        Crypto.layerSha2.pipe(
          Layer.provide(fakeSubtle({ digest: () => Promise.resolve(Uint8Array.of(1, 2, 3).buffer) }))
        )
      )
    ))

  it.effect("reports an OperationError from decryption as AuthenticationFailed", () =>
    Effect.gen(function*() {
      const aes = yield* Crypto.Aes
      const rsa = yield* Crypto.Rsa
      const key = Redacted.make(new Uint8Array(16))
      const nonce = new Uint8Array(12)
      const data = new Uint8Array(32)
      assertReason(yield* Effect.flip(aes.decryptGcm({ key, nonce, data })), "AuthenticationFailed", "decryptGcm")
      // It means something else when encrypting.
      assertReason(yield* Effect.flip(aes.encryptGcm({ key, nonce, data })), "Unknown", "encryptGcm")
      const privateKey = Redacted.make(new Uint8Array(8)) as Crypto.RsaPrivateKey
      assertReason(
        yield* Effect.flip(rsa.decryptOaep({ privateKey, hash: "SHA-256", data })),
        "AuthenticationFailed",
        "decryptOaep"
      )
    }).pipe(
      Effect.provide(
        Layer.mergeAll(Crypto.layerAes, Crypto.layerRsa).pipe(
          Layer.provide(fakeSubtle({ encrypt: raise("OperationError"), decrypt: raise("OperationError") }))
        )
      )
    ))
})

describe("Sha2 and Sha1", () => {
  it.effect("digest with the requested algorithm", () =>
    Effect.gen(function*() {
      const sha2 = yield* Crypto.Sha2
      const sha1 = yield* Crypto.Sha1
      assert.strictEqual(
        Hex.encode(yield* sha2.digest("SHA-256", encode("abc"))),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
      )
      assert.strictEqual((yield* sha2.digest("SHA-512", encode("abc"))).length, 64)
      assert.strictEqual(Hex.encode(yield* sha1.digest(encode("abc"))), "a9993e364706816aba3e25717850c26c9cd0d89d")
    }).pipe(Effect.provide(Crypto.layerSha2), Effect.provide(Crypto.layerSha1)))
})

describe("Hmac", () => {
  it.effect("computes and verifies tags with the requested hash", () =>
    Effect.gen(function*() {
      const hmac = yield* Crypto.Hmac
      const key = yield* hmac.generateKey({ hash: "SHA-512" })
      // Generated keys have the hash's block size.
      assert.strictEqual(Redacted.value(key).length, 128)
      const data = encode("data")
      const tag = yield* hmac.compute({ hash: "SHA-512", key, data })
      assert.strictEqual(tag.length, 64)
      assert.isTrue(yield* hmac.verify({ hash: "SHA-512", key, data, tag }))
      assert.isFalse(yield* hmac.verify({ hash: "SHA-256", key, data, tag }))
      assert.isFalse(yield* hmac.verify({ hash: "SHA-512", key, data, tag: tag.subarray(0, 32) }))
      const empty = yield* Effect.flip(hmac.compute({ hash: "SHA-256", key: Redacted.make(new Uint8Array()), data }))
      assertReason(empty, "InvalidKey")
    }).pipe(Effect.provide(Crypto.layerHmac)))

  it.effect("reads keys of any length from JWK, ignoring JOSE members", () =>
    Effect.gen(function*() {
      const jwk = { kty: "oct", k: Base64Url.encode(new Uint8Array(20)), alg: "HS512" }
      assert.strictEqual(Redacted.value(yield* Crypto.hmacKeyFromJwk(jwk)).length, 20)
    }))
})

describe("Aes", () => {
  it.effect("encrypts with AES-GCM and a 128-bit tag", () =>
    Effect.gen(function*() {
      const aes = yield* Crypto.Aes
      const options = { key: yield* aes.generateKey(), nonce: new Uint8Array(12), additionalData: encode("ad") }
      const data = encode("secret")
      const sealed = yield* aes.encryptGcm({ ...options, data })
      assert.strictEqual(sealed.length, data.length + 16)
      assert.deepStrictEqual(yield* aes.decryptGcm({ ...options, data: sealed }), data)
      const error = yield* Effect.flip(aes.decryptGcm({ ...options, additionalData: encode("other"), data: sealed }))
      assertReason(error, "AuthenticationFailed")
      assert.strictEqual(Redacted.value(yield* aes.generateKey({ length: 128 })).length, 16)
      const short = yield* Effect.flip(aes.encryptGcm({ ...options, key: Redacted.make(new Uint8Array(15)), data }))
      assertReason(short, "InvalidKey")
    }).pipe(Effect.provide(Crypto.layerAes)))

  it.effect("encrypts with AES-CTR, letting the counter wrap", () =>
    Effect.gen(function*() {
      const aes = yield* Crypto.Aes
      const options = { key: yield* aes.generateKey(), counter: new Uint8Array(16), counterLength: 64 }
      const data = encode("unauthenticated")
      const ciphertext = yield* aes.encryptCtr({ ...options, data })
      assert.strictEqual(ciphertext.length, data.length)
      assert.deepStrictEqual(yield* aes.decryptCtr({ ...options, data: ciphertext }), data)
      // A counter may wrap as long as no counter block repeats.
      const wrapping = { ...options, counter: new Uint8Array(16).fill(0xff), counterLength: 1 }
      const blocks = new Uint8Array(32)
      assert.deepStrictEqual(
        yield* aes.decryptCtr({ ...wrapping, data: yield* aes.encryptCtr({ ...wrapping, data: blocks }) }),
        blocks
      )
    }).pipe(Effect.provide(Crypto.layerAes)))

  it.effect("reads keys from JWK and checks their length", () =>
    Effect.gen(function*() {
      const jwk = { kty: "oct", k: Base64Url.encode(new Uint8Array(32).fill(7)) }
      assert.deepStrictEqual(Redacted.value(yield* Crypto.aesKeyFromJwk(jwk)), new Uint8Array(32).fill(7))
      const short = { kty: "oct", k: Base64Url.encode(new Uint8Array(20)) }
      assertReason(yield* Effect.flip(Crypto.aesKeyFromJwk(short)), "InvalidKey")
    }))
})

describe("Hkdf and Pbkdf2", () => {
  it.effect("derive the requested length", () =>
    Effect.gen(function*() {
      const hkdf = yield* Crypto.Hkdf
      const pbkdf2 = yield* Crypto.Pbkdf2
      const derived = yield* hkdf.derive({ hash: "SHA-256", key: Redacted.make(new Uint8Array(32)), length: 42 })
      assert.strictEqual(Redacted.value(derived).length, 42)
      const options = { hash: "SHA-256", password: encode("password"), salt: encode("salt"), iterations: 2 } as const
      const expected = yield* pbkdf2.derive({ ...options, length: 20 })
      assert.strictEqual(expected.length, 20)
      assert.isTrue(yield* pbkdf2.verify({ ...options, expected }))
      assert.isFalse(yield* pbkdf2.verify({ ...options, password: encode("wrong"), expected }))
    }).pipe(Effect.provide(Crypto.layerHkdf), Effect.provide(Crypto.layerPbkdf2)))

  // Some backends wrap lengths of 2^32 bits or more, and Node.js aborts the
  // process on iteration counts of 2^31 or more.
  it.effect("check lengths and iterations before calling Web Crypto", () =>
    Effect.gen(function*() {
      const hkdf = yield* Crypto.Hkdf
      const pbkdf2 = yield* Crypto.Pbkdf2
      const key = Redacted.make(new Uint8Array(16))
      const data = new Uint8Array(16)
      for (const length of [0, 255 * 32 + 1]) {
        assertReason(yield* Effect.flip(hkdf.derive({ hash: "SHA-256", key, length })), "BadArgument")
      }
      for (const [iterations, length] of [[0, 32], [2 ** 31, 32], [1, 2 ** 29]]) {
        assertReason(
          yield* Effect.flip(pbkdf2.derive({ hash: "SHA-256", password: data, salt: data, iterations, length })),
          "BadArgument"
        )
      }
      assertReason(
        yield* Effect.flip(
          pbkdf2.verify({ hash: "SHA-256", password: data, salt: data, iterations: 0, expected: data })
        ),
        "BadArgument",
        "verify"
      )
    }).pipe(Effect.provide(Layer.mergeAll(Crypto.layerHkdf, Crypto.layerPbkdf2).pipe(Layer.provideMerge(unreachable)))))
})

describe("Ed25519", () => {
  it.effect("signs and verifies", () =>
    Effect.gen(function*() {
      const ed25519 = yield* Crypto.Ed25519
      const { privateKey, publicKey } = yield* ed25519.generateKeyPair()
      const data = encode("data")
      const signature = yield* ed25519.sign({ privateKey, data })
      assert.strictEqual(signature.length, 64)
      assert.isTrue(yield* ed25519.verify({ publicKey, signature, data }))
      assert.isFalse(yield* ed25519.verify({ publicKey, signature, data: encode("other") }))
    }).pipe(Effect.provide(Crypto.layerEd25519)))

  it.effect("checks the length of raw keys", () =>
    Effect.gen(function*() {
      yield* Crypto.ed25519PublicKey(new Uint8Array(32))
      assertReason(yield* Effect.flip(Crypto.ed25519PublicKey(new Uint8Array(31))), "InvalidKey", "ed25519PublicKey")
      assertReason(
        yield* Effect.flip(Crypto.ed25519PrivateKeyFromRaw(new Uint8Array(31))),
        "InvalidKey",
        "ed25519PrivateKeyFromRaw"
      )
    }).pipe(Effect.provide(unreachable)))

  it.effect("wraps raw private keys in PKCS8", () =>
    Effect.gen(function*() {
      // RFC 8032, section 7.1, test 1.
      const seed = "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"
      const privateKey = yield* Crypto.ed25519PrivateKeyFromRaw(bytes(seed))
      assert.strictEqual(
        Hex.encode(yield* (yield* Crypto.Ed25519).publicKey(privateKey)),
        "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"
      )
      assert.strictEqual(Hex.encode(Redacted.value(yield* Crypto.ed25519PrivateKeyToRaw(privateKey))), seed)
      // Bytes not in the form Web Crypto exports are rejected.
      assertReason(
        yield* Effect.flip(Crypto.ed25519PrivateKeyToRaw(Redacted.make(new Uint8Array(48)) as never)),
        "InvalidKey"
      )
    }).pipe(Effect.provide(Crypto.layerEd25519)))

  it.effect("converts keys from SPKI and to and from JWK", () =>
    Effect.gen(function*() {
      const { privateKey, publicKey } = yield* (yield* Crypto.Ed25519).generateKeyPair()
      assert.deepStrictEqual(yield* Crypto.ed25519PublicKeyFromSpki(yield* spki(publicKey, "Ed25519")), publicKey)
      const jwk = yield* Crypto.ed25519PublicKeyToJwk(publicKey)
      assert.deepStrictEqual(Object.keys(jwk).sort(), ["crv", "kty", "x"])
      const decorated = { ...jwk, alg: "EdDSA", use: "enc", key_ops: ["encrypt"], ext: false, kid: "1" }
      assert.deepStrictEqual(yield* Crypto.ed25519PublicKeyFromJwk(decorated), publicKey)
      const d = Base64Url.encode(Redacted.value(yield* Crypto.ed25519PrivateKeyToRaw(privateKey)))
      assert.deepStrictEqual(yield* Crypto.ed25519PrivateKeyFromJwk({ ...jwk, d }), privateKey)
    }).pipe(Effect.provide(Crypto.layerEd25519)))
})

describe("Ecdsa", () => {
  it.effect("signs in the fixed-width P1363 encoding", () =>
    Effect.gen(function*() {
      const ecdsa = yield* Crypto.Ecdsa
      const data = encode("data")
      for (const [curve, length] of [["P-256", 64], ["P-384", 96], ["P-521", 132]] as const) {
        const { privateKey, publicKey } = yield* ecdsa.generateKeyPair({ curve })
        const signature = yield* ecdsa.sign({ curve, privateKey, hash: "SHA-256", data })
        assert.strictEqual(signature.length, length)
        assert.isTrue(yield* ecdsa.verify({ curve, publicKey, hash: "SHA-256", signature, data }))
        assert.isFalse(yield* ecdsa.verify({ curve, publicKey, hash: "SHA-384", signature, data }))
      }
      // A key on another curve is rejected when it is imported.
      const p256 = yield* ecdsa.generateKeyPair({ curve: "P-256" })
      const error = yield* Effect.flip(
        ecdsa.sign({ curve: "P-384", privateKey: p256.privateKey, hash: "SHA-256", data })
      )
      assertReason(error, "InvalidKey")
    }).pipe(Effect.provide(Crypto.layerEcdsa)))

  it.effect("checks the encoding of raw public keys", () =>
    Effect.gen(function*() {
      for (const [curve, size] of [["P-256", 32], ["P-384", 48], ["P-521", 66]] as const) {
        yield* Crypto.ecdsaPublicKey(curve, point(size))
        // Compressed points and points of another curve are rejected.
        assertReason(yield* Effect.flip(Crypto.ecdsaPublicKey(curve, point(size, 2))), "InvalidKey", "ecdsaPublicKey")
        assertReason(yield* Effect.flip(Crypto.ecdsaPublicKey(curve, point(size + 1))), "InvalidKey")
      }
    }))

  it.effect("converts keys on every curve", () =>
    Effect.gen(function*() {
      const ecdsa = yield* Crypto.Ecdsa
      for (const curve of ["P-256", "P-384", "P-521"] as const) {
        const { privateKey, publicKey } = yield* ecdsa.generateKeyPair({ curve })
        const params = { name: "ECDSA", namedCurve: curve }
        assert.deepStrictEqual(yield* Crypto.ecdsaPublicKeyFromSpki(curve, yield* spki(publicKey, params)), publicKey)
        const jwk = yield* Crypto.ecdsaPublicKeyToJwk(curve, publicKey)
        assert.strictEqual(jwk.crv, curve)
        assert.deepStrictEqual(yield* Crypto.ecdsaPublicKeyFromJwk(curve, jwk), publicKey)
        const fromJwk = yield* Crypto.ecdsaPrivateKeyFromJwk(curve, yield* privateJwk(privateKey, params))
        assert.deepStrictEqual(yield* ecdsa.publicKey(curve, fromJwk), publicKey)
      }
      // Keys on another curve are rejected.
      const p256 = yield* ecdsa.generateKeyPair({ curve: "P-256" })
      const p256Spki = yield* spki(p256.publicKey, { name: "ECDSA", namedCurve: "P-256" })
      assertReason(yield* Effect.flip(Crypto.ecdsaPublicKeyFromSpki("P-384", p256Spki)), "InvalidKey")
      assertReason(yield* Effect.flip(Crypto.ecdsaPrivateKeyFromPkcs8("P-384", p256.privateKey)), "InvalidKey")
    }).pipe(Effect.provide(Crypto.layerEcdsa)))
})

describe("Rsa", () => {
  it.effect("signs with RSA-PSS, salted with the hash length by default", () =>
    Effect.gen(function*() {
      const rsa = yield* Crypto.Rsa
      const { privateKey, publicKey } = yield* rsa.generateKeyPair()
      const data = encode("data")
      const signature = yield* rsa.signPss({ privateKey, hash: "SHA-256", data })
      assert.isTrue(yield* rsa.verifyPss({ publicKey, hash: "SHA-256", saltLength: 32, signature, data }))
      assert.isFalse(yield* rsa.verifyPss({ publicKey, hash: "SHA-256", saltLength: 0, signature, data }))
    }).pipe(Effect.provide(Crypto.layerRsa)))

  it.effect("signs with RSASSA-PKCS1-v1_5 and encrypts with RSA-OAEP on the same key", () =>
    Effect.gen(function*() {
      const rsa = yield* Crypto.Rsa
      const { privateKey, publicKey } = yield* rsa.generateKeyPair()
      assert.strictEqual(yield* rsa.modulusLength(publicKey), 2048)
      assert.deepStrictEqual(yield* rsa.publicKey(privateKey), publicKey)
      const data = encode("data")
      const signature = yield* rsa.signPkcs1v15({ privateKey, hash: "SHA-256", data })
      // PKCS #1 v1.5 signatures are deterministic.
      assert.deepStrictEqual(yield* rsa.signPkcs1v15({ privateKey, hash: "SHA-256", data }), signature)
      assert.isTrue(yield* rsa.verifyPkcs1v15({ publicKey, hash: "SHA-256", signature, data }))
      assert.isFalse(yield* rsa.verifyPkcs1v15({ publicKey, hash: "SHA-384", signature, data }))

      const label = encode("label")
      const ciphertext = yield* rsa.encryptOaep({ publicKey, hash: "SHA-256", data, label })
      assert.deepStrictEqual(yield* rsa.decryptOaep({ privateKey, hash: "SHA-256", data: ciphertext, label }), data)
      for (const options of [{ hash: "SHA-256", label: undefined }, { hash: "SHA-384", label }] as const) {
        assertReason(
          yield* Effect.flip(rsa.decryptOaep({ privateKey, data: ciphertext, ...options })),
          "AuthenticationFailed"
        )
      }
    }).pipe(Effect.provide(Crypto.layerRsa)))

  it.effect("converts keys", () =>
    Effect.gen(function*() {
      const rsa = yield* Crypto.Rsa
      const { privateKey, publicKey } = yield* rsa.generateKeyPair({ modulusLength: 3072 })
      assert.strictEqual(yield* rsa.modulusLength(publicKey), 3072)
      const jwk = yield* Crypto.rsaPublicKeyToJwk(publicKey)
      assert.deepStrictEqual(Object.keys(jwk).sort(), ["e", "kty", "n"])
      assert.deepStrictEqual(yield* Crypto.rsaPublicKeyFromJwk({ ...jwk, alg: "RSA-OAEP-256" }), publicKey)
      assert.deepStrictEqual(yield* Crypto.rsaPublicKeyFromSpki(publicKey), publicKey)
      const fromJwk = yield* Crypto.rsaPrivateKeyFromJwk(
        yield* privateJwk(privateKey, { name: "RSA-PSS", hash: "SHA-256" })
      )
      assert.deepStrictEqual(yield* rsa.publicKey(fromJwk), publicKey)
      assert.deepStrictEqual(yield* rsa.publicKey(yield* Crypto.rsaPrivateKeyFromPkcs8(privateKey)), publicKey)
      assertReason(yield* Effect.flip(Crypto.rsaPublicKeyFromSpki(new Uint8Array(16))), "InvalidKey")
    }).pipe(Effect.provide(Crypto.layerRsa)))
})

describe("Ecdh", () => {
  it.effect("derives the same secret on both sides, with the curve's length", () =>
    Effect.gen(function*() {
      const ecdh = yield* Crypto.Ecdh
      for (const [curve, length] of [["X25519", 32], ["P-256", 32], ["P-384", 48], ["P-521", 66]] as const) {
        const first = yield* ecdh.generateKeyPair({ curve })
        const second = yield* ecdh.generateKeyPair({ curve })
        const shared = yield* ecdh.deriveSharedSecret({
          curve,
          privateKey: first.privateKey,
          publicKey: second.publicKey
        })
        assert.strictEqual(Redacted.value(shared).length, length)
        assert.deepStrictEqual(
          yield* ecdh.deriveSharedSecret({ curve, privateKey: second.privateKey, publicKey: first.publicKey }),
          shared
        )
      }
    }).pipe(Effect.provide(Crypto.layerEcdh)))

  it.effect("checks the encoding of raw public keys", () =>
    Effect.gen(function*() {
      yield* Crypto.ecdhPublicKey("X25519", new Uint8Array(32))
      assertReason(
        yield* Effect.flip(Crypto.ecdhPublicKey("X25519", new Uint8Array(33))),
        "InvalidKey",
        "ecdhPublicKey"
      )
      for (const [curve, size] of [["P-256", 32], ["P-384", 48], ["P-521", 66]] as const) {
        yield* Crypto.ecdhPublicKey(curve, point(size))
        assertReason(yield* Effect.flip(Crypto.ecdhPublicKey(curve, point(size + 1))), "InvalidKey")
      }
    }))

  it.effect("converts keys", () =>
    Effect.gen(function*() {
      const ecdh = yield* Crypto.Ecdh
      // RFC 7748, section 6.1, with Alice's private key wrapped in PKCS8.
      const alice = yield* Crypto.ecdhPrivateKeyFromPkcs8(
        "X25519",
        bytes("302e020100300506032b656e0422042077076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a")
      )
      const alicePublicKey = yield* ecdh.publicKey("X25519", alice)
      assert.strictEqual(Hex.encode(alicePublicKey), "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a")
      const jwk = yield* Crypto.ecdhPublicKeyToJwk("X25519", alicePublicKey)
      assert.deepStrictEqual(yield* Crypto.ecdhPublicKeyFromJwk("X25519", jwk), alicePublicKey)
      for (const curve of ["P-256", "P-384", "P-521"] as const) {
        const { privateKey, publicKey } = yield* ecdh.generateKeyPair({ curve })
        assert.deepStrictEqual(
          yield* ecdh.publicKey(curve, yield* Crypto.ecdhPrivateKeyFromPkcs8(curve, privateKey)),
          publicKey
        )
        const ecJwk = yield* Crypto.ecdhPublicKeyToJwk(curve, publicKey)
        assert.deepStrictEqual(yield* Crypto.ecdhPublicKeyFromJwk(curve, ecJwk), publicKey)
      }
      // The algorithm must match.
      assertReason(yield* Effect.flip(Crypto.ed25519PrivateKeyFromPkcs8(alice)), "InvalidKey")
      const ed25519 = yield* (yield* Crypto.Ed25519).generateKeyPair()
      const edJwk = yield* Crypto.ed25519PublicKeyToJwk(ed25519.publicKey)
      assertReason(yield* Effect.flip(Crypto.ecdhPublicKeyFromJwk("X25519", edJwk)), "InvalidKey")
    }).pipe(Effect.provide(Layer.mergeAll(Crypto.layerEcdh, Crypto.layerEd25519))))

  it.effect("reports a rejected peer key as InvalidKey", () =>
    Effect.gen(function*() {
      const ecdh = yield* Crypto.Ecdh
      const privateKey = Redacted.make(new Uint8Array(8)) as Crypto.EcdhPrivateKey
      for (const [curve, raw] of [["X25519", new Uint8Array(32)], ["P-256", point(32)]] as const) {
        const publicKey = yield* Crypto.ecdhPublicKey(curve, raw)
        assertReason(
          yield* Effect.flip(ecdh.deriveSharedSecret({ curve, privateKey, publicKey })),
          "InvalidKey",
          "deriveSharedSecret"
        )
      }
    }).pipe(
      Effect.provide(Crypto.layerEcdh.pipe(Layer.provide(fakeSubtle({ deriveBits: raise("OperationError") }))))
    ))

  it.effect("rejects an all-zero X25519 shared secret", () =>
    Effect.gen(function*() {
      const ecdh = yield* Crypto.Ecdh
      const error = yield* Effect.flip(ecdh.deriveSharedSecret({
        curve: "X25519",
        privateKey: Redacted.make(new Uint8Array(48)) as Crypto.EcdhPrivateKey,
        publicKey: yield* Crypto.ecdhPublicKey("X25519", new Uint8Array(32))
      }))
      assertReason(error, "InvalidKey", "deriveSharedSecret")
      assert.strictEqual(error.reason.description, "X25519 shared secret must not be all zeros")
    }).pipe(
      Effect.provide(
        Crypto.layerEcdh.pipe(Layer.provide(fakeSubtle({ deriveBits: () => Promise.resolve(new ArrayBuffer(32)) })))
      )
    ))
})
