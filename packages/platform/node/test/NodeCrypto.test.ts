import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Digest from "effect/crypto/Digest"
import * as Kdf from "effect/crypto/Kdf"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as Layer from "effect/Layer"
import * as NodeCryptoModule from "node:crypto"
import { describeCrypto } from "../../node-shared/test/Crypto.test-utils.ts"

const encode = (text: string): Uint8Array => new TextEncoder().encode(text)

describe("NodeCrypto", () => {
  it.effect("layerDigest computes MD5 and SHA digests", () =>
    Effect.gen(function*() {
      const digest = yield* Digest.Digest
      const abc = new TextEncoder().encode("abc")
      // RFC 1321 and FIPS 180-2 "abc" vectors.
      assert.strictEqual(yield* digest.digestHex(Digest.md5, abc), "900150983cd24fb0d6963f7d28e17f72")
      assert.strictEqual(yield* digest.digestHex(Digest.sha1, abc), "a9993e364706816aba3e25717850c26c9cd0d89d")
      assert.strictEqual(
        yield* digest.digestHex(Digest.sha256, abc),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
      )
      assert.strictEqual((yield* digest.digest(Digest.sha512, abc)).length, 64)
    }).pipe(Effect.provide(NodeCrypto.layerDigest)))

  it.effect("layerMac signs with byte-backed and CryptoKey-backed keys", () =>
    Effect.gen(function*() {
      const mac = yield* Mac.Mac
      // RFC 4231, test case 2.
      const secret = encode("Jefe")
      const message = encode("what do ya want for nothing?")
      const expected = "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"
      const cryptoKey = yield* Effect.promise(() =>
        globalThis.crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])
      )
      for (const key of [yield* Mac.key(Mac.hmacSha256, secret), yield* Mac.fromCryptoKey(Mac.hmacSha256, cryptoKey)]) {
        const tag = yield* mac.sign(key, message)
        assert.strictEqual(Hex.encode(tag), expected)
        assert.isTrue(yield* mac.verify(key, tag, message))
        assert.isFalse(yield* mac.verify(key, tag.subarray(1), message))
      }
    }).pipe(Effect.provide(NodeCrypto.layerMac.pipe(Layer.provide(SecureRandom.layerWebCrypto)))))

  it.effect("layerKdf derives Argon2id where node:crypto has it, and HKDF through the core implementation", () =>
    Effect.gen(function*() {
      const kdf = yield* Kdf.Kdf
      const password = encode("password")
      const salt = encode("somesalt")
      // From the Argon2 reference CLI: `argon2 somesalt -id -t 2 -k 64 -p 1 -l 32`.
      const argon2id = Kdf.argon2id({ memory: 64, passes: 2, parallelism: 1 })
      if (typeof NodeCryptoModule.argon2 === "function") {
        assert.strictEqual(
          Hex.encode(yield* kdf.derive(argon2id, password, { salt, length: 32 })),
          "16a1a498734609dd01456da406de9f3d9da93e6c86c300a12fc1465214ce4922"
        )
      } else {
        const error = yield* Effect.flip(kdf.derive(argon2id, password, { salt, length: 32 }))
        assert.strictEqual(error.reason._tag, "Unsupported")
      }
      // RFC 5869, test case 3.
      assert.strictEqual(
        Hex.encode(
          yield* kdf.derive(Kdf.hkdfSha256, new Uint8Array(22).fill(0x0b), { salt: new Uint8Array(), length: 42 })
        ),
        "8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8"
      )
    }).pipe(Effect.provide(NodeCrypto.layerKdf)))

  it("layerSecureRandom is the core layer", () => {
    assert.strictEqual(NodeCrypto.layerSecureRandom, SecureRandom.layerWebCrypto)
  })
})

describeCrypto("NodeCrypto services", {
  chaCha20Poly1305: NodeCrypto.layerChaCha20Poly1305,
  xChaCha20Poly1305: NodeCrypto.layerXChaCha20Poly1305
})
