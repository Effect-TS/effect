import * as BrowserCrypto from "@effect/platform-browser/BrowserCrypto"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Exit, Fiber, Layer } from "effect"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as PlatformError from "effect/PlatformError"
import * as TestClock from "effect/testing/TestClock"
import { constants, generateKeyPairSync, privateDecrypt, webcrypto } from "node:crypto"

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

it.effect("computes HMAC and password derivation with Web Crypto", () =>
  Effect.gen(function*() {
    const service = yield* Crypto.Crypto
    const encode = (s: string) => new TextEncoder().encode(s)
    const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    assert.strictEqual(
      hex(yield* service.hmac("SHA-256", new Uint8Array(20).fill(0x0b), encode("Hi There"))),
      "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"
    )
    assert.strictEqual(
      hex(yield* service.pbkdf2("SHA-256", encode("password"), encode("salt"), 2, 32)),
      "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43"
    )
    const unsupported = yield* Effect.flip(service.digest("MD5", encode("abc")))
    assert.strictEqual(unsupported._tag, "PlatformError")
  }).pipe(
    Effect.provide(
      BrowserCrypto.layer.pipe(
        Layer.provide(Layer.succeed(BrowserCrypto.WebCrypto, webcrypto as unknown as globalThis.Crypto))
      )
    )
  ))

it.effect("owns HMAC data and PBKDF2 salt before importing a key", () =>
  Effect.gen(function*() {
    for (const operation of ["hmac", "pbkdf2"] as const) {
      const imported = yield* Deferred.make<() => void>()
      const data = new TextEncoder().encode(operation === "hmac" ? "Hi There" : "salt")
      const crypto = Object.create(globalThis.crypto, {
        subtle: {
          value: {
            importKey: (...args: Parameters<typeof webcrypto.subtle.importKey>) => {
              return new Promise((resolve, reject) => {
                Deferred.doneUnsafe(
                  imported,
                  Effect.succeed(() => {
                    webcrypto.subtle.importKey(...args).then(resolve, reject)
                  })
                )
              })
            },
            sign: webcrypto.subtle.sign.bind(webcrypto.subtle),
            deriveBits: webcrypto.subtle.deriveBits.bind(webcrypto.subtle)
          }
        }
      })
      const program = Effect.flatMap(Crypto.Crypto, (service) =>
        operation === "hmac"
          ? service.hmac("SHA-256", new Uint8Array(20).fill(0x0b), data)
          : service.pbkdf2("SHA-256", new TextEncoder().encode("password"), data, 2, 32))
      const fiber = yield* Effect.forkChild(program.pipe(Effect.provide(layerWith(crypto))))
      const release = yield* Deferred.await(imported)
      data.fill(0)
      release()
      const bytes = yield* Fiber.join(fiber)
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
      assert.strictEqual(
        hex,
        operation === "hmac"
          ? "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"
          : "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43"
      )
    }
  }))

const getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
  if (array instanceof Uint8Array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = i & 0xff
    }
  }
  return array
}

const withSubtle = (subtle: unknown): globalThis.Crypto =>
  Object.create(globalThis.crypto, { subtle: { value: subtle } })

const layerWith = (crypto: globalThis.Crypto) =>
  BrowserCrypto.layer.pipe(Layer.provide(Layer.succeed(BrowserCrypto.WebCrypto, crypto)))

const assertPlatformError = (
  exit: Exit.Exit<Uint8Array, PlatformError.PlatformError>,
  description: string
) => {
  assert.ok(Exit.isFailure(exit))
  assert.strictEqual(exit.cause.reasons.length, 1)
  const reason = exit.cause.reasons[0]
  assert.ok(Cause.isFailReason(reason))
  assert.strictEqual(reason.error._tag, "PlatformError")
  assert.instanceOf(reason.error.reason, PlatformError.SystemError)
  assert.strictEqual(reason.error.reason._tag, "Unknown")
  assert.strictEqual(reason.error.reason.module, "Crypto")
  assert.strictEqual(reason.error.reason.method, "digest")
  assert.strictEqual(reason.error.reason.description, description)
  return reason.error
}

const checkUnavailable = (crypto: globalThis.Crypto) =>
  Effect.gen(function*() {
    const service = yield* Crypto.Crypto
    const exit = yield* Effect.exit(Effect.suspend(() => service.digest("SHA-256", new Uint8Array())))
    assertPlatformError(exit, "crypto.subtle.digest is not available")
  }).pipe(Effect.provide(layerWith(crypto)))

describe("BrowserCrypto", () => {
  it.effect("generates random bytes at and above the getRandomValues limit", () => {
    const chunks: Array<number> = []

    return Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      for (const size of [65_536, 65_537, 70_000]) {
        const bytes = yield* crypto.randomBytes(size)
        assert.strictEqual(bytes.length, size)
        assert.strictEqual(bytes[0], 0)
        assert.strictEqual(bytes[size - 1], (size - 1) & 0xff)
      }
      assert.deepStrictEqual(chunks, [65_536, 65_536, 1, 65_536, 4_464])
    }).pipe(Effect.provide(BrowserCrypto.layer.pipe(
      Layer.provide(Layer.succeed(BrowserCrypto.WebCrypto, {
        ...crypto,
        getRandomValues<T extends ArrayBufferView | null>(array: T): T {
          if (array !== null) {
            assert.ok(array.byteLength <= 65_536)
            chunks.push(array.byteLength)
          }
          return getRandomValues(array)
        }
      }))
    )))
  })

  it.effect("generates UUIDv4 values from getRandomValues", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const uuid = yield* crypto.randomUUIDv4
      assert.strictEqual(uuid, "00010203-0405-4607-8809-0a0b0c0d0e0f")
      assert.match(uuid, uuidV4Regex)
    }).pipe(Effect.provide(BrowserCrypto.layer.pipe(
      Layer.provide(Layer.succeed(BrowserCrypto.WebCrypto, {
        ...crypto,
        getRandomValues
      }))
    ))))

  it.effect("generates UUIDv7 values from getRandomValues and the Clock", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const crypto = yield* Crypto.Crypto
      const uuid = yield* crypto.randomUUIDv7
      assert.strictEqual(uuid, "01234567-89ab-7607-8809-0a0b0c0d0e0f")
      assert.match(uuid, uuidV7Regex)
    }).pipe(Effect.provide(BrowserCrypto.layer.pipe(
      Layer.provide(Layer.succeed(BrowserCrypto.WebCrypto, {
        ...crypto,
        getRandomValues
      }))
    ))))

  it.effect("computes digests with subtle crypto", () => {
    const buffer = new ArrayBuffer(3)
    new Uint8Array(buffer).set([1, 2, 3])

    return Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const digest = yield* crypto.digest("SHA-256", new Uint8Array(buffer))
      assert.deepStrictEqual(digest, new Uint8Array([1, 2, 3]))
    }).pipe(
      Effect.provide(BrowserCrypto.layer.pipe(
        Layer.provide(Layer.succeed(BrowserCrypto.WebCrypto, {
          ...crypto,
          subtle: {
            ...crypto.subtle,
            digest() {
              return Promise.resolve(buffer)
            }
          }
        }))
      ))
    )
  })

  it.effect("fails with PlatformError when subtle is absent", () => checkUnavailable(withSubtle(undefined)))

  it.effect("fails with PlatformError when subtle exists but digest is absent", () =>
    checkUnavailable(withSubtle(Object.create(globalThis.crypto.subtle, { digest: { value: undefined } }))))

  it.effect("computes a real SHA-256 digest when subtle is present", () =>
    Effect.gen(function*() {
      const service = yield* Crypto.Crypto
      const bytes = yield* service.digest("SHA-256", new TextEncoder().encode("abc"))
      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
      assert.strictEqual(hex, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    }).pipe(Effect.provide(layerWith(withSubtle(webcrypto.subtle)))))

  it.effect("preserves a rejected digest promise as a typed PlatformError", () => {
    const rejection = new Error("Digest rejected by fixture")
    const subtle = Object.create(globalThis.crypto.subtle, {
      digest: { value: () => Promise.reject(rejection) }
    })
    return Effect.gen(function*() {
      const service = yield* Crypto.Crypto
      const exit = yield* Effect.exit(service.digest("SHA-256", new Uint8Array()))
      const error = assertPlatformError(exit, "Could not compute digest")
      assert.strictEqual(error.reason.cause, rejection)
    }).pipe(Effect.provide(layerWith(withSubtle(subtle))))
  })

  it.effect("synthetic control: fails with PlatformError when subtle is null", () => checkUnavailable(withSubtle(null)))

  it.effect("still dies when the entire Web Crypto object is absent", () => {
    const fixture = { crypto: globalThis.crypto }
    Object.defineProperty(fixture, "crypto", { value: undefined })
    return Effect.gen(function*() {
      const exit = yield* Effect.exit(Crypto.Crypto.pipe(Effect.provide(layerWith(fixture.crypto))))
      assert.ok(Exit.isFailure(exit))
      assert.strictEqual(exit.cause.reasons.length, 1)
      const reason = exit.cause.reasons[0]
      assert.ok(Cause.isDieReason(reason))
      assert.ok(reason.defect instanceof Error)
      assert.strictEqual(reason.defect.message, "Web Crypto API is not available")
    })
  })
})

const rsaKeys = generateKeyPairSync("rsa", { modulusLength: 2048 })
const rsaPublicKey = Uint8Array.from(rsaKeys.publicKey.export({ format: "der", type: "spki" }))
const rsaSlice = (bytes: Uint8Array): Uint8Array => {
  const backing = new Uint8Array(bytes.length + 9).fill(0xff)
  backing.set(bytes, 4)
  return backing.subarray(4, 4 + bytes.length)
}

// The independent native decryptor checks OAEP/MGF1 hashes, labels and byte ranges.
describe("BrowserCrypto RSA-OAEP", () => {
  it.effect("interoperates with native RSA for all hashes and defaults to SHA-256", () =>
    Effect.gen(function*() {
      const data = new Uint8Array([0, 1, 127, 128, 255])
      for (const hash of [undefined, "SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const) {
        const encrypted = yield* Crypto.rsaOaepEncrypt({ publicKey: rsaPublicKey, data, hash })
        assert.strictEqual(encrypted.length, 256)
        const decrypted = privateDecrypt({
          key: rsaKeys.privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: (hash ?? "SHA-256").replace("-", "").toLowerCase()
        }, encrypted)
        assert.deepStrictEqual(Uint8Array.from(decrypted), data)
      }
      const first = yield* Crypto.rsaOaepEncrypt({ publicKey: rsaPublicKey, data })
      const second = yield* Crypto.rsaOaepEncrypt({ publicKey: rsaPublicKey, data })
      assert.isFalse(first.every((byte, i) => byte === second[i]))
    }).pipe(Effect.provide(BrowserCrypto.layer)))

  it.effect("preserves sliced key, payload and label byte ranges", () =>
    Effect.gen(function*() {
      const publicKey = rsaSlice(rsaPublicKey)
      const data = rsaSlice(new TextEncoder().encode("password\0with binary suffix"))
      const label = rsaSlice(new Uint8Array([0, 255, 128, 1]))
      const before = [publicKey.slice(), data.slice(), label.slice()]
      const encrypted = yield* Crypto.rsaOaepEncrypt({ publicKey, data, label, hash: "SHA-1" })
      assert.deepStrictEqual(
        Uint8Array.from(privateDecrypt({
          key: rsaKeys.privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha1",
          oaepLabel: Buffer.from(label)
        }, encrypted)),
        data
      )
      assert.deepStrictEqual([publicKey, data, label], before)
      assert.throws(() =>
        privateDecrypt({
          key: rsaKeys.privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha1",
          oaepLabel: new Uint8Array([1])
        }, encrypted)
      )
    }).pipe(Effect.provide(BrowserCrypto.layer)))

  it.effect("returns typed platform errors for invalid keys and oversized data", () =>
    Effect.gen(function*() {
      const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
      for (
        const options of [
          { publicKey: new Uint8Array([0, 1, 2]), data: new Uint8Array([1]) },
          {
            publicKey: Uint8Array.from(ec.publicKey.export({ type: "spki", format: "der" })),
            data: new Uint8Array([1])
          },
          { publicKey: rsaPublicKey, data: new Uint8Array(300) }
        ]
      ) {
        const error = yield* Effect.flip(Crypto.rsaOaepEncrypt(options))
        assert.strictEqual(error._tag, "PlatformError")
        assert.strictEqual(error.reason._tag, "Unknown")
        assert.strictEqual(error.reason.module, "Crypto")
        assert.strictEqual(error.reason.method, "rsaOaepEncrypt")
      }
    }).pipe(Effect.provide(BrowserCrypto.layer)))
})

it.effect("owns RSA public key, plaintext and label while importing the key", () =>
  Effect.gen(function*() {
    const imported = yield* Deferred.make<() => void>()
    const publicKey = rsaSlice(rsaPublicKey)
    const data = new TextEncoder().encode("immutable plaintext")
    const label = new TextEncoder().encode("immutable label")
    const originalData = data.slice()
    const originalLabel = label.slice()
    const crypto = Object.create(globalThis.crypto, {
      subtle: {
        value: {
          importKey: (...args: Parameters<typeof webcrypto.subtle.importKey>) =>
            new Promise((resolve, reject) => {
              Deferred.doneUnsafe(
                imported,
                Effect.succeed(() => {
                  webcrypto.subtle.importKey(...args).then(resolve, reject)
                })
              )
            }),
          encrypt: webcrypto.subtle.encrypt.bind(webcrypto.subtle)
        }
      }
    })
    const layer = BrowserCrypto.layer.pipe(Layer.provide(Layer.succeed(BrowserCrypto.WebCrypto, crypto)))
    const fiber = yield* Effect.forkChild(Crypto.rsaOaepEncrypt({ publicKey, data, label }).pipe(Effect.provide(layer)))
    const release = yield* Deferred.await(imported)
    publicKey.fill(0)
    data.fill(0)
    label.fill(0)
    release()
    const encrypted = yield* Fiber.join(fiber)
    assert.deepStrictEqual(
      Uint8Array.from(privateDecrypt({
        key: rsaKeys.privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
        oaepLabel: originalLabel
      }, encrypted)),
      originalData
    )
  }))
