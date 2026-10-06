import * as DenoCrypto from "@effect/platform-deno/DenoCrypto"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Exit, Fiber, Layer } from "effect"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import { constants, generateKeyPairSync, privateDecrypt, webcrypto } from "node:crypto"
import { cryptoTests } from "../../node-shared/test/utils/Crypto.ts"

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const hex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

describe("DenoCrypto", () => {
  it.effect("dies during layer construction when the Web Crypto object is absent", () =>
    Effect.gen(function*() {
      const layer = DenoCrypto.layer.pipe(
        Layer.provide(Layer.succeed(DenoCrypto.WebCrypto, undefined as unknown as globalThis.Crypto))
      )
      const exit = yield* Effect.exit(Crypto.Crypto.pipe(Effect.provide(layer)))
      assert.ok(Exit.isFailure(exit))
      const reason = exit.cause.reasons[0]
      assert.ok(Cause.isDieReason(reason))
      assert.instanceOf(reason.defect, Error)
      assert.strictEqual((reason.defect as Error).message, "Web Crypto API is not available")
    }))

  it.effect("computes MD5, HMAC, and PBKDF2 vectors", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const encode = (s: string) => new TextEncoder().encode(s)
      assert.strictEqual(hex(yield* crypto.digest("MD5", encode("abc"))), "900150983cd24fb0d6963f7d28e17f72")
      assert.strictEqual(
        hex(yield* Crypto.hmac("SHA-256", new Uint8Array(20).fill(0x0b), encode("Hi There"))),
        "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"
      )
      assert.strictEqual(
        hex(yield* Crypto.pbkdf2("SHA-256", encode("password"), encode("salt"), 2, 32)),
        "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43"
      )
    }).pipe(Effect.provide(DenoCrypto.layer)))

  it.effect("computes SHA-256 digests", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const digest = yield* crypto.digest("SHA-256", new TextEncoder().encode("hello"))
      assert.strictEqual(hex(digest), "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
    }).pipe(Effect.provide(DenoCrypto.layer)))

  it.effect("generates random bytes larger than the Web Crypto quota", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const bytes = yield* crypto.randomBytes(70_000)
      assert.strictEqual(bytes.length, 70_000)
    }).pipe(Effect.provide(DenoCrypto.layer)))

  it.effect("generates UUIDv4 values", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      assert.match(yield* crypto.randomUUIDv4(), uuidV4Regex)
    }).pipe(Effect.provide(DenoCrypto.layer)))

  it.effect("generates UUIDv7 values", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      assert.match(yield* crypto.randomUUIDv7(), uuidV7Regex)
    }).pipe(Effect.provide(DenoCrypto.layer)))
})

const rsaKeys = generateKeyPairSync("rsa", { modulusLength: 2048 })
const rsaPublicKey = Uint8Array.from(rsaKeys.publicKey.export({ format: "der", type: "spki" }))
const rsaSlice = (bytes: Uint8Array): Uint8Array => {
  const backing = new Uint8Array(bytes.length + 9).fill(0xff)
  backing.set(bytes, 4)
  return backing.subarray(4, 4 + bytes.length)
}

// The independent native decryptor checks OAEP/MGF1 hashes, labels and byte ranges.
describe("DenoCrypto RSA-OAEP", () => {
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
    }).pipe(Effect.provide(DenoCrypto.layer)))

  it.effect("preserves sliced key, payload and label byte ranges", () =>
    Effect.gen(function*() {
      const publicKey = rsaSlice(rsaPublicKey)
      const data = rsaSlice(new TextEncoder().encode("password\0with binary suffix"))
      const label = rsaSlice(new TextEncoder().encode("sliced label"))
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
    }).pipe(Effect.provide(DenoCrypto.layer)))

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
    }).pipe(Effect.provide(DenoCrypto.layer)))
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
    const layer = DenoCrypto.layer.pipe(Layer.provide(Layer.succeed(DenoCrypto.WebCrypto, crypto)))
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

// Deno's node:crypto decrypt shim converts OAEP labels through UTF-8, so binary
// labels use the independent Web Crypto private-key operation as their oracle.
it.effect("preserves non-UTF8 OAEP label bytes", () =>
  Effect.gen(function*() {
    const label = rsaSlice(new Uint8Array([0, 255, 128, 1]))
    const data = new Uint8Array([0, 255, 42])
    const encrypted = yield* Crypto.rsaOaepEncrypt({ publicKey: rsaPublicKey, data, label, hash: "SHA-1" })
    const decrypted = yield* Effect.promise(async () => {
      const privateKey = await globalThis.crypto.subtle.importKey(
        "pkcs8",
        Uint8Array.from(rsaKeys.privateKey.export({ type: "pkcs8", format: "der" })),
        { name: "RSA-OAEP", hash: "SHA-1" },
        false,
        ["decrypt"]
      )
      return globalThis.crypto.subtle.decrypt(
        { name: "RSA-OAEP", label: Uint8Array.from(label) },
        privateKey,
        new Uint8Array(encrypted)
      )
    })
    assert.deepStrictEqual(new Uint8Array(decrypted), data)
  }).pipe(Effect.provide(DenoCrypto.layer)))

it.effect("matches HMAC SHA vectors and byte-oriented PBKDF2 with sliced inputs", () =>
  Effect.gen(function*() {
    const encode = (text: string) => new TextEncoder().encode(text)
    const slice = (bytes: Uint8Array): Uint8Array => {
      const backing = new Uint8Array(bytes.length + 4).fill(0xff)
      backing.set(bytes, 2)
      return backing.subarray(2, 2 + bytes.length)
    }
    const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
    const key = slice(new Uint8Array(20).fill(0x0b))
    const data = slice(encode("Hi There"))
    // RFC 2202 and RFC 4231, test case 1.
    for (
      const [algorithm, expected] of [
        ["SHA-1", "b617318655057264e28bc0b6fb378c8ef146be00"],
        ["SHA-256", "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"],
        ["SHA-384", "afd03944d84895626b0825f4ab46907f15f9dadbe4101ec682aa034c7cebc59cfaea9ea9076ede7f4af152e8b2fa9cb6"],
        [
          "SHA-512",
          "87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cde" +
          "daa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854"
        ]
      ] as const
    ) {
      assert.strictEqual(hex(yield* Crypto.hmac(algorithm, key, data)), expected)
    }
    const password = slice(encode("password"))
    const salt = slice(encode("salt"))
    // RFC 6070, test case 2. Length is in bytes, not bits.
    assert.strictEqual(
      hex(yield* Crypto.pbkdf2("SHA-1", password, salt, 2, 20)),
      "ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957"
    )
    assert.strictEqual(
      hex(yield* Crypto.pbkdf2("SHA-256", password, salt, 2, 32)),
      "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43"
    )
    assert.deepStrictEqual(key, new Uint8Array(20).fill(0x0b))
    assert.deepStrictEqual(data, encode("Hi There"))
    assert.deepStrictEqual(password, encode("password"))
    assert.deepStrictEqual(salt, encode("salt"))
  }).pipe(Effect.provide(DenoCrypto.layer)))

it.effect("preserves synchronous and asynchronous primitive failures as platform errors", () =>
  Effect.gen(function*() {
    for (const method of ["hmac", "pbkdf2", "rsaOaepEncrypt"] as const) {
      for (const mode of ["throw", "reject", "missing"] as const) {
        const failure = new Error("Rejected crypto operation")
        const fail = () => {
          if (mode === "throw") throw failure
          return Promise.reject(failure)
        }
        const subtle = {
          importKey: () => Promise.resolve({}),
          sign: fail,
          deriveBits: fail,
          encrypt: fail
        }
        const platform = Object.create(globalThis.crypto, {
          subtle: { value: mode === "missing" ? undefined : subtle }
        })
        const service = yield* Crypto.Crypto.pipe(Effect.provide(
          DenoCrypto.layer.pipe(Layer.provide(Layer.succeed(DenoCrypto.WebCrypto, platform)))
        ))
        const bytes = Uint8Array.of(1, 2, 3)
        const operation = method === "hmac"
          ? Crypto.hmac("SHA-256", bytes, bytes)
          : method === "pbkdf2"
          ? Crypto.pbkdf2("SHA-256", bytes, bytes, 1, 32)
          : Crypto.rsaOaepEncrypt({ publicKey: bytes, data: bytes }).pipe(
            Effect.provideService(Crypto.Crypto, service)
          )
        const error = yield* Effect.flip(operation.pipe(Effect.provideService(Crypto.Crypto, service)))
        assert.strictEqual(error._tag, "PlatformError")
        assert.strictEqual(error.reason._tag, "Unknown")
        assert.strictEqual(error.reason.method, method)
        assert.strictEqual(error.reason.module, "Crypto")
        assert.strictEqual(
          mode === "missing" ? error.reason.cause instanceof TypeError : error.reason.cause === failure,
          true
        )
      }
    }
  }))

cryptoTests(DenoCrypto.layer, true, true)
