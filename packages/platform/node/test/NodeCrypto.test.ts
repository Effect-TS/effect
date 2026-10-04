import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as TestClock from "effect/testing/TestClock"
import { constants, generateKeyPairSync, privateDecrypt } from "node:crypto"

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const hex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

describe("NodeCrypto", () => {
  it.effect("computes protocol MD5 digests", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      assert.strictEqual(
        hex(yield* crypto.digest("MD5", new TextEncoder().encode("abc"))),
        "900150983cd24fb0d6963f7d28e17f72"
      )
    }).pipe(Effect.provide(NodeCrypto.layer)))

  it.effect("computes HMAC-SHA256 and PBKDF2 test vectors", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const encode = (s: string) => new TextEncoder().encode(s)
      assert.strictEqual(
        hex(yield* crypto.hmac("SHA-256", new Uint8Array(20).fill(0x0b), encode("Hi There"))),
        "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"
      )
      assert.strictEqual(
        hex(yield* crypto.pbkdf2("SHA-256", encode("password"), encode("salt"), 2, 32)),
        "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43"
      )
      for (const [iterations, length] of [[0, 32], [1, 0], [1.5, 32], [1, -1]]) {
        const error = yield* Effect.flip(
          crypto.pbkdf2("SHA-256", encode("password"), encode("salt"), iterations, length)
        )
        assert.strictEqual(error.reason._tag, "BadArgument")
      }
    }).pipe(Effect.provide(NodeCrypto.layer)))

  it.effect("generates empty random bytes", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const bytes = yield* crypto.randomBytes(0)
      assert.deepStrictEqual(bytes, new Uint8Array(0))
    }).pipe(Effect.provide(NodeCrypto.layer)))

  it.effect("generates random bytes with the requested size", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const bytes = yield* crypto.randomBytes(32)
      assert.strictEqual(bytes.length, 32)
    }).pipe(Effect.provide(NodeCrypto.layer)))

  it.effect("fails invalid random byte sizes", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const error = yield* Effect.flip(crypto.randomBytes(-1))
      assert.strictEqual(error._tag, "PlatformError")
    }).pipe(Effect.provide(NodeCrypto.layer)))

  it.effect("generates UUIDv4 values", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const uuid1 = yield* crypto.randomUUIDv4
      const uuid2 = yield* crypto.randomUUIDv4
      assert.match(uuid1, uuidV4Regex)
      assert.match(uuid2, uuidV4Regex)
      assert.notStrictEqual(uuid1, uuid2)
    }).pipe(Effect.provide(NodeCrypto.layer)))

  it.effect("generates UUIDv7 values", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const crypto = yield* Crypto.Crypto
      const uuid = yield* crypto.randomUUIDv7
      assert.match(uuid, uuidV7Regex)
      assert.strictEqual(uuid.slice(0, 13), "01234567-89ab")
    }).pipe(Effect.provide(NodeCrypto.layer)))

  it.effect("computes SHA-256 digests", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const digest = yield* crypto.digest("SHA-256", new TextEncoder().encode("hello"))
      assert.strictEqual(hex(digest), "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
    }).pipe(Effect.provide(NodeCrypto.layer)))
})

const rsaKeys = generateKeyPairSync("rsa", { modulusLength: 2048 })
const rsaPublicKey = Uint8Array.from(rsaKeys.publicKey.export({ format: "der", type: "spki" }))
const rsaSlice = (bytes: Uint8Array): Uint8Array => {
  const backing = new Uint8Array(bytes.length + 9).fill(0xff)
  backing.set(bytes, 4)
  return backing.subarray(4, 4 + bytes.length)
}

// The independent native decryptor checks OAEP/MGF1 hashes, labels and byte ranges.
describe("NodeCrypto RSA-OAEP", () => {
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
    }).pipe(Effect.provide(NodeCrypto.layer)))

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
    }).pipe(Effect.provide(NodeCrypto.layer)))

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
    }).pipe(Effect.provide(NodeCrypto.layer)))
})

it.effect("rejects invalid runtime OAEP hashes rather than falling back to SHA-1", () =>
  Effect.gen(function*() {
    for (const hash of ["MD5", "unsupported"] as const) {
      const error = yield* Effect.flip(Crypto.rsaOaepEncrypt({
        publicKey: rsaPublicKey,
        data: new Uint8Array([42]),
        hash: hash as Crypto.HmacAlgorithm
      }))
      assert.strictEqual(error._tag, "PlatformError")
      assert.strictEqual(error.reason.method, "rsaOaepEncrypt")
      assert.strictEqual(error.reason._tag, "Unknown")
      if (error.reason._tag === "Unknown") assert.instanceOf(error.reason.cause, TypeError)
    }
  }).pipe(Effect.provide(NodeCrypto.layer)))
