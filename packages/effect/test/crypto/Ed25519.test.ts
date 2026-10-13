import { assert, describe, it } from "@effect/vitest"
import * as Ed25519 from "effect/crypto/Ed25519"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Hex from "effect/encoding/Hex"
import * as Redacted from "effect/Redacted"
import { assertReason, bytes, encode, spki, unreachable } from "../utils/crypto.ts"

describe("Ed25519", () => {
  it.effect("signs and verifies", () =>
    Effect.gen(function*() {
      const ed25519 = yield* Ed25519.Ed25519
      const { privateKey, publicKey } = yield* ed25519.generateKeyPair()
      const data = encode("data")
      const signature = yield* ed25519.sign({ privateKey, data })
      assert.strictEqual(signature.length, 64)
      assert.isTrue(yield* ed25519.verify({ publicKey, signature, data }))
      assert.isFalse(yield* ed25519.verify({ publicKey, signature, data: encode("other") }))
    }).pipe(Effect.provide(Ed25519.layer)))

  it.effect("checks the length of raw keys", () =>
    Effect.gen(function*() {
      const raw = new Uint8Array(32)
      const publicKey = yield* Ed25519.publicKeyFromRaw(raw)
      // The key does not alias the input.
      raw[0] = 1
      assert.strictEqual(publicKey[0], 0)
      assertReason(yield* Effect.flip(Ed25519.publicKeyFromRaw(new Uint8Array(31))), "InvalidKey", "publicKeyFromRaw")
      assertReason(
        yield* Effect.flip(Ed25519.privateKeyFromRaw(new Uint8Array(31))),
        "InvalidKey",
        "privateKeyFromRaw"
      )
    }).pipe(Effect.provide(unreachable)))

  it.effect("wraps raw private keys in PKCS8", () =>
    Effect.gen(function*() {
      // RFC 8032, section 7.1, test 1.
      const seed = "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"
      const privateKey = yield* Ed25519.privateKeyFromRaw(bytes(seed))
      assert.strictEqual(
        Hex.encode(yield* Ed25519.publicKeyFromPrivateKey(privateKey)),
        "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"
      )
      assert.strictEqual(Hex.encode(Redacted.value(yield* Ed25519.privateKeyToRaw(privateKey))), seed)
      // Bytes not in the form Web Crypto exports are rejected.
      assertReason(
        yield* Effect.flip(Ed25519.privateKeyToRaw(Redacted.make(new Uint8Array(48)) as never)),
        "InvalidKey"
      )
    }))

  it.effect("converts keys to and from SPKI and JWK", () =>
    Effect.gen(function*() {
      const { privateKey, publicKey } = yield* (yield* Ed25519.Ed25519).generateKeyPair()
      const encoded = yield* Ed25519.publicKeyToSpki(publicKey)
      assert.deepStrictEqual(encoded, yield* spki(publicKey, "Ed25519"))
      assert.deepStrictEqual(yield* Ed25519.publicKeyFromSpki(encoded), publicKey)
      const jwk = yield* Ed25519.publicKeyToJwk(publicKey)
      assert.deepStrictEqual(Object.keys(jwk).sort(), ["crv", "kty", "x"])
      const decorated = { ...jwk, alg: "EdDSA", use: "enc", key_ops: ["encrypt"], ext: false, kid: "1" }
      assert.deepStrictEqual(yield* Ed25519.publicKeyFromJwk(decorated), publicKey)
      const d = Base64Url.encode(Redacted.value(yield* Ed25519.privateKeyToRaw(privateKey)))
      assert.deepStrictEqual(yield* Ed25519.privateKeyFromJwk({ ...jwk, d }), privateKey)
    }).pipe(Effect.provide(Ed25519.layer)))

  it.effect("rejects a public JWK as a private key", () =>
    Effect.gen(function*() {
      assertReason(
        yield* Effect.flip(Ed25519.privateKeyFromJwk({ kty: "OKP", crv: "Ed25519", x: "AAAA" })),
        "InvalidKey",
        "privateKeyFromJwk"
      )
    }).pipe(Effect.provide(unreachable)))
})
