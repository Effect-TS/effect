import { assert, it } from "@effect/vitest"
import { KeyFormat, Signature } from "effect/crypto"
import * as Effect from "effect/Effect"
import { Jwk, Jwks } from "effect/jose"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as NodeCrypto from "node:crypto"
import { assertReason, es256PublicJwk, layer, rfc7515, rs256PublicJwk, secretJwk } from "./utils.ts"

it.effect("generates algorithm-bound key pairs that import for signing and verification", () =>
  Effect.gen(function*() {
    for (const algorithm of ["RS256", "PS256", "ES256", "EdDSA"] as const) {
      const pair = yield* Jwk.generateKeyPair({ algorithm, kid: "k1" })
      assert.strictEqual(pair.publicKey.alg, algorithm)
      assert.strictEqual(pair.publicKey.kid, "k1")
      assert.strictEqual(pair.publicKey.use, "sig")
      assert.strictEqual(Redacted.value(pair.privateKey).use, "sig")
      assert.isFalse("d" in pair.publicKey)

      const privateKey = yield* Jwk.importPrivate(pair.privateKey, algorithm)
      const publicKey = yield* Jwk.importPublic(pair.publicKey, algorithm)
      assert.strictEqual(privateKey.algorithm, algorithm)
      assert.strictEqual(privateKey.kid, "k1")
      assert.strictEqual(publicKey.algorithm, algorithm)
      assert.strictEqual(publicKey.kid, "k1")
      assert.isTrue(Signature.isPrivateKey(privateKey.key))
      assert.isTrue(Signature.isPublicKey(publicKey.key))
      assert.deepStrictEqual(publicKey.jwk, pair.publicKey)
      assert.deepStrictEqual(yield* Jwk.exportPublic(publicKey), pair.publicKey)
    }
  }).pipe(Effect.provide(layer)))

it.effect("rejects padded base64url in every public JWK key member", () =>
  Effect.gen(function*() {
    const pair = yield* Jwk.generateKeyPair({ algorithm: "EdDSA" })
    for (
      const { algorithm, jwk, members } of [
        { algorithm: "RS256", jwk: rs256PublicJwk, members: ["n", "e"] },
        { algorithm: "ES256", jwk: es256PublicJwk, members: ["x", "y"] },
        { algorithm: "EdDSA", jwk: pair.publicKey, members: ["x"] }
      ] as const
    ) {
      for (const member of members) {
        const invalid = { ...jwk, [member]: `${Reflect.get(jwk, member)}=` }
        assert.isFalse(Schema.is(Jwk.PublicJwk)(invalid))
        const error = yield* Jwk.importPublic(invalid, algorithm).pipe(Effect.flip)
        assertReason(error, "InvalidKey")
        assert.include(error.reason.description, "base64url")
        assert.isUndefined(error.reason.cause)
      }
    }
  }).pipe(Effect.provide(layer)))

it.effect("rejects padded base64url in every private JWK key member without exposing it", () =>
  Effect.gen(function*() {
    const pair = yield* Jwk.generateKeyPair({ algorithm: "EdDSA" })
    for (
      const { algorithm, jwk, members } of [
        { algorithm: "RS256", jwk: rfc7515.rs256.jwk, members: ["n", "e", "d", "p", "q", "dp", "dq", "qi"] },
        { algorithm: "ES256", jwk: rfc7515.es256.jwk, members: ["x", "y", "d"] },
        { algorithm: "EdDSA", jwk: Redacted.value(pair.privateKey), members: ["x", "d"] }
      ] as const
    ) {
      for (const member of members) {
        const value = `${Reflect.get(jwk, member)}=`
        const invalid = { ...jwk, [member]: value }
        assert.isFalse(Schema.is(Jwk.PrivateJwk)(invalid))
        const error = yield* Jwk.importPrivate(Redacted.make(invalid), algorithm).pipe(Effect.flip)
        assertReason(error, "InvalidKey")
        assert.include(error.reason.description, "base64url")
        assert.isUndefined(error.reason.cause)
        assert.notInclude(JSON.stringify(error), value)
      }
    }
  }).pipe(Effect.provide(layer)))

it.effect("rejects whitespace, invalid alphabets, invalid lengths, and nonzero trailing bits in JWK members", () =>
  Effect.gen(function*() {
    const { d: _d, ...publicJwk } = rfc7515.es256.jwk
    for (const value of [`${rfc7515.es256.jwk.x} `, "***", "/w", "A", "AB"]) {
      const publicError = yield* Jwk.importPublic({ ...publicJwk, x: value }, "ES256").pipe(Effect.flip)
      assertReason(publicError, "InvalidKey")
      assert.include(publicError.reason.description, "base64url")

      const privateError = yield* Jwk.importPrivate(
        Redacted.make({ ...rfc7515.es256.jwk, d: value }),
        "ES256"
      ).pipe(Effect.flip)
      assertReason(privateError, "InvalidKey")
      assert.include(privateError.reason.description, "base64url")
      assert.isUndefined(privateError.reason.cause)
    }
  }))

it.effect("binds imported keys to the selected algorithm and honours JWK metadata", () =>
  Effect.gen(function*() {
    const key = yield* Jwk.importPublic(es256PublicJwk, "ES256")
    assert.strictEqual(key.algorithm, "ES256")
    assert.isUndefined(key.kid)

    // Curve family and selected algorithm must agree.
    assertReason(yield* Jwk.importPublic(es256PublicJwk, "EdDSA").pipe(Effect.flip), "InvalidKey")
    // Declared `alg` wins over the selection when they disagree.
    assertReason(
      yield* Jwk.importPublic({ ...es256PublicJwk, alg: "RS256" }, "ES256").pipe(Effect.flip),
      "InvalidKey"
    )
    // `use`/`key_ops` that exclude signing are not verification keys.
    assertReason(
      yield* Jwk.importPublic({ ...es256PublicJwk, use: "enc" }, "ES256").pipe(Effect.flip),
      "InvalidKey"
    )
    // Private members never satisfy the public schema.
    assert.isFalse(Schema.is(Jwk.PublicJwk)(rfc7515.es256.jwk))
    assert.isTrue(Schema.is(Jwk.PrivateJwk)(rfc7515.es256.jwk))
    // Not even RSA factors without `d`.
    const { d: _d, ...factors } = rfc7515.rs256.jwk
    assert.isFalse(Schema.is(Jwk.PublicJwk)(factors))
    assert.isFalse(Schema.is(Jwks.KeySet)({ keys: [factors] }))
    assertReason(
      yield* Jwk.importPublic(factors as unknown as Jwk.PublicJwk, "RS256").pipe(Effect.flip),
      "InvalidKey"
    )
  }))

it.effect("rejects RSA keys below 2048 bits", () =>
  Effect.gen(function*() {
    const { publicKey } = NodeCrypto.generateKeyPairSync("rsa", { modulusLength: 1024 })
    const jwk = publicKey.export({ format: "jwk" }) as unknown as Jwk.PublicJwk
    assertReason(yield* Jwk.importPublic(jwk, "RS256").pipe(Effect.flip), "InvalidKey")
  }))

it.effect("imports PKCS#8 private keys with the same result as the JWK form", () =>
  Effect.gen(function*() {
    const der = yield* KeyFormat.decodePrivate(KeyFormat.jwk, Signature.ecdsaP256, rfc7515.es256.jwk).pipe(
      Effect.flatMap((key) => KeyFormat.encode(KeyFormat.pkcs8, key))
    )
    const key = yield* Jwk.importPkcs8(Redacted.make(der), "ES256", { kid: "apple" })
    assert.strictEqual(key.algorithm, "ES256")
    assert.strictEqual(key.kid, "apple")

    const exported = Redacted.value(yield* Jwk.exportPrivate(key))
    assert.deepInclude(exported, { ...rfc7515.es256.jwk, kid: "apple" })

    assertReason(yield* Jwk.importPkcs8(Redacted.make(der), "EdDSA").pipe(Effect.flip), "InvalidKey")
  }))

it.effect("imports octet keys with per-algorithm length rules", () =>
  Effect.gen(function*() {
    const hmac = yield* Jwk.importSecret(Redacted.make(rfc7515.hs256.jwk), "HS256")
    assert.strictEqual(hmac.algorithm, "HS256")
    const dir = yield* Jwk.importSecret(Redacted.make({ ...secretJwk, kid: "enc-1" }), "dir")
    assert.strictEqual(dir.algorithm, "dir")
    assert.strictEqual(dir.kid, "enc-1")

    // HS256 needs at least 32 bytes; `dir` needs exactly 32.
    const short = Redacted.make({ kty: "oct", k: "AAAAAAAAAAAAAAAAAAAAAA" } satisfies Jwk.SecretJwk)
    assertReason(yield* Jwk.importSecret(short, "HS256").pipe(Effect.flip), "InvalidKey")
    assertReason(yield* Jwk.importSecret(Redacted.make(rfc7515.hs256.jwk), "dir").pipe(Effect.flip), "InvalidKey")
    assertReason(
      yield* Jwk.importSecret(Redacted.make({ ...secretJwk, alg: "HS256" }), "dir").pipe(Effect.flip),
      "InvalidKey"
    )
    // A symmetric key performs both operations, so `key_ops` must allow both.
    yield* Jwk.importSecret(Redacted.make({ ...secretJwk, key_ops: ["sign", "verify"] }), "HS256")
    assertReason(
      yield* Jwk.importSecret(Redacted.make({ ...secretJwk, key_ops: ["verify"] }), "HS256").pipe(Effect.flip),
      "InvalidKey"
    )
    assertReason(
      yield* Jwk.importSecret(Redacted.make({ ...secretJwk, key_ops: ["decrypt"] }), "dir").pipe(Effect.flip),
      "InvalidKey"
    )
  }))
