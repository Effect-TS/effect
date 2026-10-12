import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Hex from "effect/encoding/Hex"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"

const assertInvalid = (error: Crypto.CryptoError) => assert.strictEqual(error.reason._tag, "InvalidKey")

const bytes = (hex: string): Uint8Array => Result.getOrThrow(Hex.decode(hex))

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

const layers = Layer.mergeAll(Crypto.layerEd25519, Crypto.layerEcdsa, Crypto.layerRsa, Crypto.layerEcdh)

describe("key formats", () => {
  it.effect("reads symmetric keys from JWK", () =>
    Effect.gen(function*() {
      const jwk = { kty: "oct", k: Base64Url.encode(new Uint8Array(32).fill(7)) }
      assert.deepStrictEqual(Redacted.value(yield* Crypto.aesKeyFromJwk(jwk)), new Uint8Array(32).fill(7))
      // JOSE members are ignored, and only AES checks the key length.
      const short = { kty: "oct", k: Base64Url.encode(new Uint8Array(20)) }
      assert.strictEqual(Redacted.value(yield* Crypto.hmacKeyFromJwk({ ...short, alg: "HS512" })).length, 20)
      assertInvalid(yield* Effect.flip(Crypto.aesKeyFromJwk(short)))
    }))

  it.effect("wraps raw Ed25519 private keys in PKCS8", () =>
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
      assertInvalid(yield* Effect.flip(Crypto.ed25519PrivateKeyToRaw(Redacted.make(new Uint8Array(48)) as never)))
    }).pipe(Effect.provide(layers)))

  it.effect("converts Ed25519 and X25519 keys", () =>
    Effect.gen(function*() {
      const ed25519 = yield* (yield* Crypto.Ed25519).generateKeyPair()
      const edSpki = yield* spki(ed25519.publicKey, "Ed25519")
      assert.deepStrictEqual(yield* Crypto.ed25519PublicKeyFromSpki(edSpki), ed25519.publicKey)
      const jwk = yield* Crypto.ed25519PublicKeyToJwk(ed25519.publicKey)
      assert.deepStrictEqual(Object.keys(jwk).sort(), ["crv", "kty", "x"])
      const decorated = { ...jwk, alg: "EdDSA", use: "enc", key_ops: ["encrypt"], ext: false, kid: "1" }
      assert.deepStrictEqual(yield* Crypto.ed25519PublicKeyFromJwk(decorated), ed25519.publicKey)
      const d = Base64Url.encode(Redacted.value(yield* Crypto.ed25519PrivateKeyToRaw(ed25519.privateKey)))
      assert.deepStrictEqual(yield* Crypto.ed25519PrivateKeyFromJwk({ ...jwk, d }), ed25519.privateKey)

      // RFC 7748, section 6.1, with Alice's private key wrapped in PKCS8.
      const alice = yield* Crypto.ecdhPrivateKeyFromPkcs8(
        "X25519",
        bytes("302e020100300506032b656e0422042077076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a")
      )
      const alicePublicKey = yield* (yield* Crypto.Ecdh).publicKey("X25519", alice)
      assert.strictEqual(Hex.encode(alicePublicKey), "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a")
      const xJwk = yield* Crypto.ecdhPublicKeyToJwk("X25519", alicePublicKey)
      assert.deepStrictEqual(yield* Crypto.ecdhPublicKeyFromJwk("X25519", xJwk), alicePublicKey)

      // The algorithm must match.
      assertInvalid(yield* Effect.flip(Crypto.ed25519PrivateKeyFromPkcs8(alice)))
      assertInvalid(yield* Effect.flip(Crypto.ecdhPublicKeyFromJwk("X25519", jwk)))
    }).pipe(Effect.provide(layers)))

  it.effect("converts EC keys on every curve", () =>
    Effect.gen(function*() {
      const ecdsa = yield* Crypto.Ecdsa
      const ecdh = yield* Crypto.Ecdh
      for (const curve of ["P-256", "P-384", "P-521"] as const) {
        const signing = yield* ecdsa.generateKeyPair({ curve })
        const ecSpki = yield* spki(signing.publicKey, { name: "ECDSA", namedCurve: curve })
        assert.deepStrictEqual(yield* Crypto.ecdsaPublicKeyFromSpki(curve, ecSpki), signing.publicKey)
        const jwk = yield* Crypto.ecdsaPublicKeyToJwk(curve, signing.publicKey)
        assert.strictEqual(jwk.crv, curve)
        assert.deepStrictEqual(yield* Crypto.ecdsaPublicKeyFromJwk(curve, jwk), signing.publicKey)
        const fromJwk = yield* Crypto.ecdsaPrivateKeyFromJwk(
          curve,
          yield* privateJwk(signing.privateKey, { name: "ECDSA", namedCurve: curve })
        )
        assert.deepStrictEqual(yield* ecdsa.publicKey(curve, fromJwk), signing.publicKey)

        const agreeing = yield* ecdh.generateKeyPair({ curve })
        const fromPkcs8 = yield* Crypto.ecdhPrivateKeyFromPkcs8(curve, agreeing.privateKey)
        assert.deepStrictEqual(yield* ecdh.publicKey(curve, fromPkcs8), agreeing.publicKey)
        const ecdhJwk = yield* Crypto.ecdhPublicKeyToJwk(curve, agreeing.publicKey)
        assert.deepStrictEqual(yield* Crypto.ecdhPublicKeyFromJwk(curve, ecdhJwk), agreeing.publicKey)
      }
      // Keys on another curve are rejected.
      const p256 = yield* ecdsa.generateKeyPair({ curve: "P-256" })
      const p256Spki = yield* spki(p256.publicKey, { name: "ECDSA", namedCurve: "P-256" })
      assertInvalid(yield* Effect.flip(Crypto.ecdsaPublicKeyFromSpki("P-384", p256Spki)))
      assertInvalid(yield* Effect.flip(Crypto.ecdsaPrivateKeyFromPkcs8("P-384", p256.privateKey)))
    }).pipe(Effect.provide(layers)))

  it.effect("converts RSA keys", () =>
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
      const fromPkcs8 = yield* Crypto.rsaPrivateKeyFromPkcs8(privateKey)
      assert.deepStrictEqual(yield* rsa.publicKey(fromPkcs8), publicKey)
      assertInvalid(yield* Effect.flip(Crypto.rsaPublicKeyFromSpki(new Uint8Array(16))))
    }).pipe(Effect.provide(layers)))
})
