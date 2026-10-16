import { Jwe, Jwk, Jws } from "@effect/auth/Jose"
import { assert, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { SecureRandom } from "effect/crypto"
import * as jose from "jose"
import { cryptoLayer, privateJwk, secret, secretJwk, text, utf8 } from "./fixtures.ts"

// Selected panva/jose compact, critical-header, and key-import contracts adapted
// to public Effect workflows; see ../../THIRD_PARTY_NOTICES.md. Independent signatures
// are necessary because an implementation can round-trip its own wire mistakes.
for (const algorithm of ["RS256", "PS256", "ES256", "EdDSA"] as const) {
  it.effect(`generates interoperable ${algorithm} keys and imports PKCS8 without changing caller bytes`, () =>
    Effect.gen(function*() {
      const pair = yield* Jwk.generateKeyPair({ algorithm, kid: "generated" })
      const signing = yield* Jwk.importPrivate(pair.privateKey, algorithm)
      const der = Redacted.value(signing.material).slice()
      const original = der.slice()
      const restored = yield* Jwk.importPkcs8(Redacted.make(der), algorithm, { kid: "restored" })
      const { key_ops, ...publicJwk } = pair.publicKey
      const publicKey = yield* Effect.promise(() =>
        jose.importJWK({ ...publicJwk, ...(key_ops === undefined ? {} : { key_ops: [...key_ops] }) }, algorithm)
      )
      const token = yield* Jws.sign(Redacted.make(utf8("generated")), restored, { alg: algorithm })
      const verified = yield* Effect.promise(() => jose.compactVerify(Redacted.value(token), publicKey))

      assert.strictEqual(text(verified.payload), "generated")
      assert.strictEqual(pair.publicKey.kid, "generated")
      assert.strictEqual(Redacted.value(restored.jwk).kid, "restored")
      assert.deepStrictEqual(der, original)
    }).pipe(Effect.provide(cryptoLayer)))

  it.effect(`interoperates in both directions with ${algorithm} JWKs and compact JWS`, () =>
    Effect.gen(function*() {
      const pair = yield* Effect.promise(() => jose.generateKeyPair(algorithm, { extractable: true }))

      const originalPrivate = yield* Effect.promise(() => jose.exportJWK(pair.privateKey))
      const originalPublic = yield* Effect.promise(() => jose.exportJWK(pair.publicKey))
      const signing = yield* Jwk.importPrivate(Redacted.make(originalPrivate), algorithm)
      const verifying = yield* Jwk.importPublic(originalPublic, algorithm)

      assert.deepStrictEqual<unknown>(Redacted.value(yield* Jwk.exportPrivate(signing)), originalPrivate)
      assert.deepStrictEqual<unknown>(yield* Jwk.exportPublic(verifying), originalPublic)
      const ours = yield* Jws.sign(Redacted.make(utf8("message")), signing, { alg: algorithm })

      const upstream = yield* Effect.promise(() =>
        jose.compactVerify(Redacted.value(ours), pair.publicKey, { algorithms: [algorithm] })
      )

      assert.strictEqual(text(upstream.payload), "message")

      const theirs = yield* Effect.promise(() =>
        new jose.CompactSign(utf8("message"))
          .setProtectedHeader({ alg: algorithm })
          .sign(pair.privateKey)
      )

      const verified = yield* Jws.verify(Redacted.make(theirs), verifying, {
        algorithms: [algorithm]
      })

      assert.strictEqual(text(Redacted.value(verified.payload)), "message")
    }).pipe(Effect.provide(cryptoLayer)))
}

it.effect("interoperates with HS256, including an empty compact payload", () =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const ours = yield* Jws.sign(Redacted.make(new Uint8Array()), key, { alg: "HS256" })
    const result = yield* Effect.promise(() => jose.compactVerify(Redacted.value(ours), secret))

    assert.lengthOf(result.payload, 0)

    const theirs = yield* Effect.promise(() =>
      new jose.CompactSign(utf8("payload")).setProtectedHeader({ alg: "HS256" }).sign(secret)
    )

    assert.strictEqual(
      text(
        Redacted.value(
          (yield* Jws.verify(Redacted.make(theirs), key, { algorithms: ["HS256"] })).payload
        )
      ),
      "payload"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("denies asymmetric signing with a verify-only key", () =>
  Effect.gen(function*() {
    const restricted = yield* Jwk.importPrivate(
      Redacted.make({ ...privateJwk, key_ops: ["verify"] }),
      "ES256"
    )

    assert.strictEqual(
      (yield* Jws.sign(Redacted.make(utf8("payload")), restricted, { alg: "ES256" }).pipe(
        Effect.flip
      ))._tag,
      "JoseInvalidKey"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects payload tampering and disallowed algorithms", () =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")

    const token = yield* Effect.promise(() =>
      new jose.CompactSign(utf8("payload")).setProtectedHeader({ alg: "HS256" }).sign(secret)
    )

    const parts = token.split(".")

    const tampered = Redacted.make(`${parts[0]}.${jose.base64url.encode("different")}.${parts[2]}`)

    assert.strictEqual(
      (yield* Jws.verify(tampered, key, { algorithms: ["HS256"] }).pipe(Effect.flip))._tag,
      "JoseSignatureVerificationFailed"
    )
    assert.strictEqual(
      (yield* Jws.verify(Redacted.make(token), key, { algorithms: ["RS256"] }).pipe(Effect.flip))
        ._tag,
      "JoseAlgorithmNotAllowed"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("classifies JWE RNG failures without exposing native causes", () =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")
    const random = yield* SecureRandom.SecureRandom

    const error = yield* Jwe.encrypt(Redacted.make(utf8("payload")), key, {
      alg: "dir",
      enc: "A256GCM"
    }).pipe(
      Effect.provideService(SecureRandom.SecureRandom, {
        ...random,
        randomBytes: () => Effect.die(new Error("private-rng-canary"))
      }),
      Effect.flip
    )

    assert.strictEqual(error._tag, "JoseCryptoUnavailable")
    assert.notInclude(JSON.stringify(error), "private-rng-canary")
    assert.notInclude(String(error), "private-rng-canary")
  }).pipe(Effect.provide(cryptoLayer)))

it.effect(
  "interoperates with compact dir/A256GCM and authenticates the header, ciphertext and tag",
  () =>
    Effect.gen(function*() {
      const key = yield* Jwk.importSecret(
        Redacted.make({ ...secretJwk, use: "enc", key_ops: ["encrypt", "decrypt"] }),
        "dir"
      )

      const plaintext = "It’s a dangerous business, Frodo, going out your door."

      const theirs = yield* Effect.promise(() =>
        new jose.CompactEncrypt(utf8(plaintext))
          .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
          .setInitializationVector(new Uint8Array(12))
          .encrypt(secret)
      )

      const decoded = yield* Jwe.decrypt(Redacted.make(theirs), key)

      assert.strictEqual(text(Redacted.value(decoded.plaintext)), plaintext)

      const ours = yield* Jwe.encrypt(Redacted.make(utf8(plaintext)), key, {
        alg: "dir",
        enc: "A256GCM"
      })

      const independent = yield* Effect.promise(() => jose.compactDecrypt(Redacted.value(ours), secret))

      assert.strictEqual(text(independent.plaintext), plaintext)
      const parts = theirs.split(".")

      for (
        const changed of [
          [
            jose.base64url.encode(JSON.stringify({ alg: "dir", enc: "A256GCM", kid: "changed" })),
            ...parts.slice(1)
          ].join("."),
          [...parts.slice(0, 3), jose.base64url.encode(utf8("changed")), parts[4]].join("."),
          [...parts.slice(0, 4), jose.base64url.encode(new Uint8Array(16))].join(".")
        ]
      ) {
        assert.strictEqual(
          (yield* Jwe.decrypt(Redacted.make(changed), key).pipe(Effect.flip))._tag,
          "JoseDecryptionFailed"
        )
      }
    }).pipe(Effect.provide(cryptoLayer))
)
