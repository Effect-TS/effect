import { assert, describe, it } from "@effect/vitest"
import * as Ecdh from "effect/crypto/Ecdh"
import * as Ed25519 from "effect/crypto/Ed25519"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { assertReason, bytes, fakeSubtle, point, privateJwk, raise, spki, unreachable } from "../utils/crypto.ts"

const ecdhParams = (curve: Ecdh.Curve) => curve === "X25519" ? "X25519" : { name: "ECDH", namedCurve: curve }

describe("Ecdh", () => {
  it.effect("derives the same secret on both sides, with the curve's length", () =>
    Effect.gen(function*() {
      const ecdh = yield* Ecdh.Ecdh
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
    }).pipe(Effect.provide(Ecdh.layer)))

  it.effect("checks the encoding of raw public keys", () =>
    Effect.gen(function*() {
      const raw = new Uint8Array(32)
      // The key is a copy, not the input.
      assert.notStrictEqual(yield* Ecdh.publicKeyFromRaw("X25519", raw), raw)
      assertReason(
        yield* Effect.flip(Ecdh.publicKeyFromRaw("X25519", new Uint8Array(33))),
        "InvalidKey",
        "publicKeyFromRaw"
      )
      for (const [curve, size] of [["P-256", 32], ["P-384", 48], ["P-521", 66]] as const) {
        yield* Ecdh.publicKeyFromRaw(curve, point(size))
        assertReason(yield* Effect.flip(Ecdh.publicKeyFromRaw(curve, point(size + 1))), "InvalidKey")
      }
    }))

  it.effect("converts keys", () =>
    Effect.gen(function*() {
      const ecdh = yield* Ecdh.Ecdh
      // RFC 7748, section 6.1.
      const aliceRaw = "77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a"
      const alice = yield* Ecdh.privateKeyFromRaw("X25519", bytes(aliceRaw))
      assert.strictEqual(Hex.encode(Redacted.value(yield* Ecdh.privateKeyToRaw("X25519", alice))), aliceRaw)
      // Raw keys are wrapped in the PKCS8 form Web Crypto exports.
      assert.deepStrictEqual(yield* Ecdh.privateKeyFromPkcs8("X25519", alice), alice)
      const alicePublicKey = yield* Ecdh.publicKeyFromPrivateKey("X25519", alice)
      assert.strictEqual(Hex.encode(alicePublicKey), "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a")
      for (const curve of ["X25519", "P-256", "P-384", "P-521"] as const) {
        const { privateKey, publicKey } = yield* ecdh.generateKeyPair({ curve })
        assert.deepStrictEqual(
          yield* Ecdh.publicKeyFromPrivateKey(curve, yield* Ecdh.privateKeyFromPkcs8(curve, privateKey)),
          publicKey
        )
        const jwk = yield* Ecdh.publicKeyToJwk(curve, publicKey)
        assert.deepStrictEqual(yield* Ecdh.publicKeyFromJwk(curve, jwk), publicKey)
        const fromJwk = yield* Ecdh.privateKeyFromJwk(
          curve,
          yield* privateJwk(privateKey, ecdhParams(curve), "deriveBits")
        )
        assert.deepStrictEqual(yield* Ecdh.publicKeyFromPrivateKey(curve, fromJwk), publicKey)
        const encoded = yield* Ecdh.publicKeyToSpki(curve, publicKey)
        assert.deepStrictEqual(encoded, yield* spki(publicKey, ecdhParams(curve)))
        assert.deepStrictEqual(yield* Ecdh.publicKeyFromSpki(curve, encoded), publicKey)
      }
      assertReason(
        yield* Effect.flip(Ecdh.privateKeyFromRaw("X25519", new Uint8Array(31))),
        "InvalidKey",
        "privateKeyFromRaw"
      )
      const p256 = yield* ecdh.generateKeyPair({ curve: "P-256" })
      assertReason(
        yield* Effect.flip(Ecdh.privateKeyToRaw("X25519", p256.privateKey)),
        "InvalidKey",
        "privateKeyToRaw"
      )
      // The algorithm must match.
      assertReason(yield* Effect.flip(Ed25519.privateKeyFromPkcs8(alice)), "InvalidKey")
      const ed25519 = yield* (yield* Ed25519.Ed25519).generateKeyPair()
      const edJwk = yield* Ed25519.publicKeyToJwk(ed25519.publicKey)
      assertReason(yield* Effect.flip(Ecdh.publicKeyFromJwk("X25519", edJwk)), "InvalidKey")
    }).pipe(Effect.provide(Layer.mergeAll(Ecdh.layer, Ed25519.layer))))

  // Deno imports points that are not on the curve and rejects them with a
  // `TypeError` when they are used; other runtimes raise an `OperationError`.
  it.effect("reports a rejected peer key as InvalidKey", () =>
    Effect.gen(function*() {
      const privateKey = Redacted.make(new Uint8Array(8)) as Ecdh.PrivateKey
      for (const name of ["OperationError", "TypeError"]) {
        const ecdh = yield* Ecdh.Ecdh.pipe(
          Effect.provide(Ecdh.layer.pipe(Layer.provide(fakeSubtle({ deriveBits: raise(name) }))))
        )
        for (const [curve, raw] of [["X25519", new Uint8Array(32)], ["P-256", point(32)]] as const) {
          const publicKey = yield* Ecdh.publicKeyFromRaw(curve, raw)
          assertReason(
            yield* Effect.flip(ecdh.deriveSharedSecret({ curve, privateKey, publicKey })),
            "InvalidKey",
            "deriveSharedSecret"
          )
        }
      }
    }))

  it.effect("reports a public key that cannot be encoded as InvalidKey", () =>
    Effect.gen(function*() {
      const publicKey = yield* Ecdh.publicKeyFromRaw("P-256", point(32))
      assertReason(yield* Effect.flip(Ecdh.publicKeyToSpki("P-256", publicKey)), "InvalidKey", "publicKeyToSpki")
      assertReason(yield* Effect.flip(Ecdh.publicKeyToJwk("P-256", publicKey)), "InvalidKey", "publicKeyToJwk")
    }).pipe(Effect.provide(fakeSubtle({ exportKey: raise("TypeError") }))))

  it.effect("rejects a public JWK as a private key", () =>
    Effect.gen(function*() {
      assertReason(
        yield* Effect.flip(Ecdh.privateKeyFromJwk("X25519", { kty: "OKP", crv: "X25519", x: "AAAA" })),
        "InvalidKey",
        "privateKeyFromJwk"
      )
    }).pipe(Effect.provide(unreachable)))

  it.effect("rejects an all-zero X25519 shared secret", () =>
    Effect.gen(function*() {
      const ecdh = yield* Ecdh.Ecdh
      const error = yield* Effect.flip(ecdh.deriveSharedSecret({
        curve: "X25519",
        privateKey: Redacted.make(new Uint8Array(48)) as Ecdh.PrivateKey,
        publicKey: yield* Ecdh.publicKeyFromRaw("X25519", new Uint8Array(32))
      }))
      assertReason(error, "InvalidKey", "deriveSharedSecret")
      assert.strictEqual(error.reason.description, "X25519 shared secret must not be all zeros")
    }).pipe(
      Effect.provide(
        Ecdh.layer.pipe(Layer.provide(fakeSubtle({ deriveBits: () => Promise.resolve(new ArrayBuffer(32)) })))
      )
    ))
})
