import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import { Buffer } from "node:buffer"
import { inspect } from "node:util"
import { assertReason, encode } from "../utils/crypto.ts"

// RFC 2202 and RFC 4231, test case 2.
const jefe = encode("Jefe")
const message = encode("what do ya want for nothing?")
const vectors: ReadonlyArray<readonly [Mac.Algorithm, string]> = [
  [Mac.hmacSha1, "effcdf6ae5eb2fa2d27416d5f184df9c259a7c79"],
  [Mac.hmacSha256, "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"],
  [
    Mac.hmacSha384,
    "af45d2e376484031617f78d2b58a6b1b9c7ef464f5a01b47e42ec3736322445e8e2240ca5e69e2c78b3239ecfab21649"
  ],
  [
    Mac.hmacSha512,
    "164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737"
  ]
]

const layer = Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))

const importHmac = (hash: string, extractable: boolean, usages: Array<KeyUsage> = ["sign", "verify"]) =>
  Effect.promise(() =>
    globalThis.crypto.subtle.importKey("raw", jefe as BufferSource, { name: "HMAC", hash }, extractable, usages)
  )

describe("Mac", () => {
  it.effect("signs and verifies the published vectors", () =>
    Effect.gen(function*() {
      const mac = yield* Mac.Mac
      for (const [algorithm, hex] of vectors) {
        const key = yield* Mac.key(algorithm, jefe)
        assert.strictEqual(key.algorithm, algorithm)
        const tag = yield* mac.sign(key, message)
        assert.strictEqual(Hex.encode(tag), hex)
        assert.isTrue(yield* mac.verify(key, tag, message))
        const tampered = tag.slice()
        tampered[0] ^= 1
        assert.isFalse(yield* mac.verify(key, tampered, message))
        assert.isFalse(yield* mac.verify(key, tag.subarray(1), message))
      }
      assertReason(yield* Effect.flip(Mac.key(Mac.hmacSha256, new Uint8Array())), "InvalidKey", "key")
    }).pipe(Effect.provide(layer)))

  it.effect("generates keys from SecureRandom bytes", () =>
    Effect.gen(function*() {
      const mac = yield* Mac.Mac
      const key = yield* mac.generateKey(Mac.hmacSha256)
      assert.strictEqual(key.algorithm, Mac.hmacSha256)
      // The hash's block size, as Web Crypto generates.
      assert.deepStrictEqual(yield* Mac.toBytes(key), new Uint8Array(64).fill(7))
      assert.isTrue(yield* mac.verify(key, yield* mac.sign(key, message), message))
    }).pipe(
      Effect.provide(Mac.layerWebCrypto),
      Effect.provide(
        Layer.succeed(SecureRandom.SecureRandom, SecureRandom.make((size) => new Uint8Array(size).fill(7)))
      )
    ))

  it.effect("copies key bytes in and out, redacts them and compares keys by reference", () =>
    Effect.gen(function*() {
      const mac = yield* Mac.Mac
      // A Buffer's `slice` returns a view, so it must not be how bytes are copied.
      for (const input of [jefe.slice(), Buffer.from(jefe)]) {
        const key = yield* Mac.key(Mac.hmacSha256, input)
        input.fill(0)
        const exported = yield* Mac.toBytes(key)
        assert.deepStrictEqual(exported, jefe)
        exported.fill(0)
        assert.deepStrictEqual(yield* Mac.toBytes(key), jefe)
        assert.strictEqual(Hex.encode(yield* mac.sign(key, message)), vectors[1][1])
      }
      const key = yield* Mac.key(Mac.hmacSha256, jefe)

      // Display shows only the algorithm, so keys with different bytes look the same.
      const other = yield* Mac.key(Mac.hmacSha256, encode("other"))
      assert.strictEqual(String(key), String(other))
      assert.strictEqual(JSON.stringify(key), JSON.stringify(other))
      assert.strictEqual(inspect(key), inspect(other))
      assert.isFalse(Equal.equals(key, yield* Mac.key(Mac.hmacSha256, jefe)))
    }).pipe(Effect.provide(layer)))

  it.effect("uses CryptoKeys that match the algorithm, without exporting non-extractable ones", () =>
    Effect.gen(function*() {
      const mac = yield* Mac.Mac
      const key = yield* Mac.fromCryptoKey(Mac.hmacSha256, yield* importHmac("SHA-256", false))
      const tag = yield* mac.sign(key, message)
      assert.strictEqual(Hex.encode(tag), vectors[1][1])
      assert.isTrue(yield* mac.verify(key, tag, message))
      assertReason(yield* Effect.flip(Mac.toBytes(key)), "NotExtractable", "toBytes")

      const extractable = yield* Mac.fromCryptoKey(Mac.hmacSha256, yield* importHmac("SHA-256", true))
      assert.deepStrictEqual(yield* Mac.toBytes(extractable), jefe)

      const wrongHash = yield* importHmac("SHA-512", false)
      // A Mac.Key both signs and verifies, so it needs both usages.
      const signOnly = yield* importHmac("SHA-256", false, ["sign"])
      const verifyOnly = yield* importHmac("SHA-256", false, ["verify"])
      const aes = yield* Effect.promise(() =>
        globalThis.crypto.subtle.importKey("raw", new Uint8Array(32), "AES-GCM", false, ["encrypt"])
      )
      for (const cryptoKey of [wrongHash, signOnly, verifyOnly, aes]) {
        assertReason(yield* Effect.flip(Mac.fromCryptoKey(Mac.hmacSha256, cryptoKey)), "InvalidKey", "fromCryptoKey")
      }
    }).pipe(Effect.provide(layer)))

  it.effect("compares bytes, dying on unequal lengths", () =>
    Effect.gen(function*() {
      assert.isTrue(yield* Mac.timingSafeEqual(encode("tag"), encode("tag")))
      assert.isFalse(yield* Mac.timingSafeEqual(encode("tag"), encode("tab")))
      const exit = yield* Effect.exit(Mac.timingSafeEqual(encode("tag"), encode("tags")))
      assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause), "expected a defect")
    }))
})
