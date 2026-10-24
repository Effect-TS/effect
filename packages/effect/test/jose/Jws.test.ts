import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { Jwk, Jwks, Jws } from "effect/jose"
import * as Redacted from "effect/Redacted"
import * as jose from "jose"
import { assertReason, base64url, es256PublicJwk, layer, rfc7515, rs256PublicJwk, text, utf8 } from "./utils.ts"

it.effect("verifies the RFC 7515 Appendix A compact serializations", () =>
  Effect.gen(function*() {
    const payload = base64url(rfc7515.payload)

    const hmac = yield* Jwk.importSecret(Redacted.make(rfc7515.hs256.jwk), "HS256")
    const a1 = yield* Jws.verify(rfc7515.hs256.token, hmac)
    assert.deepStrictEqual(a1.protectedHeader, { typ: "JWT", alg: "HS256" })
    assert.deepStrictEqual(a1.payload, payload)

    const rsa = yield* Jwk.importPublic(rs256PublicJwk, "RS256")
    const a2 = yield* Jws.verify(Redacted.make(rfc7515.rs256.token), rsa)
    assert.deepStrictEqual(a2.protectedHeader, { alg: "RS256" })
    assert.deepStrictEqual(a2.payload, payload)

    const ec = yield* Jwk.importPublic(es256PublicJwk, "ES256")
    const a3 = yield* Jws.verify(rfc7515.es256.token, ec)
    assert.deepStrictEqual(a3.payload, payload)
  }).pipe(Effect.provide(layer)))

// RSASSA-PKCS1-v1_5 is deterministic, so signing the RFC payload with the RFC
// key must reproduce the RFC token byte for byte.
it.effect("reproduces the RFC 7515 A.2 RS256 signature", () =>
  Effect.gen(function*() {
    const key = yield* Jwk.importPrivate(Redacted.make(rfc7515.rs256.jwk), "RS256")
    const token = yield* Jws.sign(base64url(rfc7515.payload), key)
    assert.strictEqual(Redacted.value(token), rfc7515.rs256.token)
  }).pipe(Effect.provide(layer)))

it.effect("interoperates with jose for every supported algorithm and carries the key id", () =>
  Effect.gen(function*() {
    for (const algorithm of ["HS256", "RS256", "PS256", "ES256", "EdDSA"] as const) {
      let signingKey: Jwk.SigningKey
      let verificationKey: Jwk.VerificationKey
      let theirKey: Awaited<ReturnType<typeof jose.importJWK>>
      if (algorithm === "HS256") {
        const k = new Uint8Array(32).fill(1)
        const jwk = Redacted.make({ kty: "oct", k: jose.base64url.encode(k), kid: "k1" } satisfies Jwk.SecretJwk)
        signingKey = verificationKey = yield* Jwk.importSecret(jwk, "HS256")
        theirKey = k
      } else {
        const pair = yield* Jwk.generateKeyPair({ algorithm, kid: "k1" })
        signingKey = yield* Jwk.importPrivate(pair.privateKey, algorithm)
        verificationKey = yield* Jwk.importPublic(pair.publicKey, algorithm)
        theirKey = yield* Effect.promise(() => jose.importJWK(pair.publicKey, algorithm))
      }

      const ours = yield* Jws.sign(utf8("hello"), signingKey, { typ: "JOSE" })
      const theirs = yield* Effect.promise(() => jose.compactVerify(Redacted.value(ours), theirKey))
      assert.strictEqual(text(theirs.payload), "hello")
      // `kid` comes from the key, `alg` from its algorithm.
      assert.deepStrictEqual(theirs.protectedHeader, { alg: algorithm, kid: "k1", typ: "JOSE" })

      const verified = yield* Jws.verify(ours, verificationKey)
      assert.strictEqual(text(verified.payload), "hello")
      assert.strictEqual(verified.protectedHeader.kid, "k1")
    }
  }).pipe(Effect.provide(layer)))

it.effect("rejects forged, malformed, and algorithm-confused tokens", () =>
  Effect.gen(function*() {
    const hmac = yield* Jwk.importSecret(Redacted.make(rfc7515.hs256.jwk), "HS256")
    const rsa = yield* Jwk.importPublic(rs256PublicJwk, "RS256")
    const [header, payload, signature] = rfc7515.hs256.token.split(".")

    const forged = `${header}.${jose.base64url.encode(utf8("{\"iss\":\"eve\"}"))}.${signature}`
    assertReason(yield* Jws.verify(forged, hmac).pipe(Effect.flip), "SignatureVerificationFailed")

    // The token's algorithm must be the key's algorithm. An HS256 token
    // must never be checked with an RSA public key as the HMAC secret.
    assertReason(yield* Jws.verify(rfc7515.hs256.token, rsa).pipe(Effect.flip), "AlgorithmNotAllowed")
    assertReason(yield* Jws.verify(rfc7515.rs256.token, hmac).pipe(Effect.flip), "AlgorithmNotAllowed")

    const unsecured = `${jose.base64url.encode(utf8("{\"alg\":\"none\"}"))}.${payload}.`
    assertReason(yield* Jws.verify(unsecured, hmac).pipe(Effect.flip), "InvalidToken")

    const crit = `${
      jose.base64url.encode(utf8("{\"alg\":\"HS256\",\"crit\":[\"exp\"],\"exp\":1}"))
    }.${payload}.${signature}`
    assertReason(yield* Jws.verify(crit, hmac).pipe(Effect.flip), "InvalidToken")

    assertReason(yield* Jws.verify(`${header}.${payload}`, hmac).pipe(Effect.flip), "InvalidToken")
    assertReason(yield* Jws.verify(`${header}.${payload}.${signature}=`, hmac).pipe(Effect.flip), "InvalidToken")
    assertReason(yield* Jws.verify("", hmac).pipe(Effect.flip), "InvalidToken")
  }).pipe(Effect.provide(layer)))

it.effect("resolves the verification key from the Jwks service by algorithm and kid", () =>
  Effect.gen(function*() {
    const one = yield* Jwk.generateKeyPair({ algorithm: "ES256", kid: "one" })
    const two = yield* Jwk.generateKeyPair({ algorithm: "ES256", kid: "two" })
    const keySet = Jwks.layerLocal({ keys: [one.publicKey, two.publicKey] })
    const signingKey = yield* Jwk.importPrivate(two.privateKey, "ES256")
    const token = yield* Jws.sign(utf8("payload"), signingKey)

    const verified = yield* Jws.verifyWithKeySet(token, { algorithms: ["ES256"] }).pipe(Effect.provide(keySet))
    assert.strictEqual(text(verified.payload), "payload")
    assert.strictEqual(verified.key.kid, "two")
    assert.deepStrictEqual(verified.key.jwk, two.publicKey)

    // The allowlist is enforced before any key lookup.
    assertReason(
      yield* Jws.verifyWithKeySet(token, { algorithms: ["RS256", "EdDSA"] }).pipe(Effect.provide(keySet), Effect.flip),
      "AlgorithmNotAllowed"
    )
    // Symmetric tokens never resolve through a public key set.
    const hmac = yield* Jwk.importSecret(Redacted.make(rfc7515.hs256.jwk), "HS256")
    const symmetric = yield* Jws.sign(utf8("payload"), hmac)
    assertReason(
      yield* Jws.verifyWithKeySet(symmetric, { algorithms: ["ES256"] }).pipe(Effect.provide(keySet), Effect.flip),
      "AlgorithmNotAllowed"
    )
  }).pipe(Effect.provide(layer)))
