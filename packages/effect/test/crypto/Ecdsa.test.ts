import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Ecdsa from "effect/crypto/Ecdsa"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { assertReason, encode, fakeSubtle, point, privateJwk, raise, spki, unreachable } from "../utils/crypto.ts"

describe("Ecdsa", () => {
  it.effect("signs in the fixed-width P1363 encoding", () =>
    Effect.gen(function*() {
      const ecdsa = yield* Ecdsa.Ecdsa
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
    }).pipe(Effect.provide(Ecdsa.layer)))

  it.effect("checks the encoding of raw public keys", () =>
    Effect.gen(function*() {
      for (const [curve, size] of [["P-256", 32], ["P-384", 48], ["P-521", 66]] as const) {
        const raw = point(size)
        const key = yield* Ecdsa.publicKeyFromRaw(curve, raw)
        // The key is a copy, not the input.
        assert.notStrictEqual(key, raw)
        assert.deepStrictEqual(key, raw)
        // Compressed points and points of another curve are rejected.
        assertReason(
          yield* Effect.flip(Ecdsa.publicKeyFromRaw(curve, point(size, 2))),
          "InvalidKey",
          "publicKeyFromRaw"
        )
        assertReason(yield* Effect.flip(Ecdsa.publicKeyFromRaw(curve, point(size + 1))), "InvalidKey")
      }
    }))

  it.effect("converts keys on every curve", () =>
    Effect.gen(function*() {
      const ecdsa = yield* Ecdsa.Ecdsa
      for (const curve of ["P-256", "P-384", "P-521"] as const) {
        const { privateKey, publicKey } = yield* ecdsa.generateKeyPair({ curve })
        const params = { name: "ECDSA", namedCurve: curve }
        const encoded = yield* Ecdsa.publicKeyToSpki(curve, publicKey)
        assert.deepStrictEqual(encoded, yield* spki(publicKey, params))
        assert.deepStrictEqual(yield* Ecdsa.publicKeyFromSpki(curve, encoded), publicKey)
        const jwk = yield* Ecdsa.publicKeyToJwk(curve, publicKey)
        assert.strictEqual(jwk.crv, curve)
        assert.deepStrictEqual(yield* Ecdsa.publicKeyFromJwk(curve, jwk), publicKey)
        const fromJwk = yield* Ecdsa.privateKeyFromJwk(curve, yield* privateJwk(privateKey, params))
        assert.deepStrictEqual(yield* Ecdsa.publicKeyFromPrivateKey(curve, fromJwk), publicKey)
      }
      // Keys on another curve are rejected.
      const p256 = yield* ecdsa.generateKeyPair({ curve: "P-256" })
      const p256Spki = yield* spki(p256.publicKey, { name: "ECDSA", namedCurve: "P-256" })
      assertReason(yield* Effect.flip(Ecdsa.publicKeyFromSpki("P-384", p256Spki)), "InvalidKey")
      assertReason(yield* Effect.flip(Ecdsa.privateKeyFromPkcs8("P-384", p256.privateKey)), "InvalidKey")
    }).pipe(Effect.provide(Ecdsa.layer)))

  // Deno imports points that are not on the curve and rejects them with a
  // `TypeError` when they are used.
  it.effect("reports a public key rejected when it is used as InvalidKey", () =>
    Effect.gen(function*() {
      const ecdsa = yield* Ecdsa.Ecdsa
      const publicKey = yield* Ecdsa.publicKeyFromRaw("P-256", point(32))
      const options = {
        curve: "P-256",
        publicKey,
        hash: "SHA-256",
        signature: new Uint8Array(64),
        data: encode("data")
      } as const
      assertReason(yield* Effect.flip(ecdsa.verify(options)), "InvalidKey", "verify")
      assertReason(yield* Effect.flip(Ecdsa.publicKeyToSpki("P-256", publicKey)), "InvalidKey", "publicKeyToSpki")
      assertReason(yield* Effect.flip(Ecdsa.publicKeyToJwk("P-256", publicKey)), "InvalidKey", "publicKeyToJwk")
      // An unrelated TypeError during signing is a defect, not a typed failure.
      const exit = yield* Effect.exit(
        ecdsa.sign({
          curve: "P-256",
          privateKey: Redacted.make(new Uint8Array(8)) as Ecdsa.PrivateKey,
          hash: "SHA-256",
          data: encode("data")
        })
      )
      if (!Exit.isFailure(exit)) assert.fail("expected a defect")
      assert.isTrue(Cause.hasDies(exit.cause))
      assert.include(String(Cause.squash(exit.cause)), "TypeError from fixture")
    }).pipe(
      Effect.provide(
        Ecdsa.layer.pipe(
          Layer.provideMerge(
            fakeSubtle({ verify: raise("TypeError"), sign: raise("TypeError"), exportKey: raise("TypeError") })
          )
        )
      )
    ))

  it.effect("rejects a public JWK as a private key", () =>
    Effect.gen(function*() {
      assertReason(
        yield* Effect.flip(Ecdsa.privateKeyFromJwk("P-256", { kty: "EC", crv: "P-256", x: "AAAA", y: "AAAA" })),
        "InvalidKey",
        "privateKeyFromJwk"
      )
    }).pipe(Effect.provide(unreachable)))
})
