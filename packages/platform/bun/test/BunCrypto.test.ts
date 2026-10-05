import * as BunCrypto from "@effect/platform-bun/BunCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import { constants, generateKeyPairSync, privateDecrypt } from "node:crypto"

const hex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

describe("BunCrypto", () => {
  it.effect("computes PostgreSQL authentication primitives", () =>
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
    }).pipe(Effect.provide(BunCrypto.layer)))
})

const rsaKeys = generateKeyPairSync("rsa", { modulusLength: 2048 })
const rsaPublicKey = Uint8Array.from(rsaKeys.publicKey.export({ format: "der", type: "spki" }))
const rsaSlice = (bytes: Uint8Array): Uint8Array => {
  const backing = new Uint8Array(bytes.length + 9).fill(0xff)
  backing.set(bytes, 4)
  return backing.subarray(4, 4 + bytes.length)
}

// The independent native decryptor checks OAEP/MGF1 hashes, labels and byte ranges.
describe("BunCrypto RSA-OAEP", () => {
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
    }).pipe(Effect.provide(BunCrypto.layer)))

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
    }).pipe(Effect.provide(BunCrypto.layer)))

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
    }).pipe(Effect.provide(BunCrypto.layer)))
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
  }).pipe(Effect.provide(BunCrypto.layer)))

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
  }).pipe(Effect.provide(BunCrypto.layer)))
