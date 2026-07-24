import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Schema from "effect/Schema"
import * as Jwe from "effect/unstable/jose/Jwe"
import * as Jwk from "effect/unstable/jose/Jwk"
import * as Jws from "effect/unstable/jose/Jws"
import * as Jwt from "effect/unstable/jose/Jwt"

const claims = { iss: "iss", sub: "sub", aud: "aud", exp: 9999999999, iat: 1 }

describe("JOSE security remediations", () => {
  describe("Jwk.isCompatibleWith / guards", () => {
    it("binds algorithm family to key type and rejects use:enc", () =>
      Effect.gen(function*() {
        const { publicJwk } = yield* Jwt.generateSigningKey()
        assert.isTrue(Jwk.isCompatibleWith("ES256", publicJwk))
        assert.isFalse(Jwk.isCompatibleWith("ES384", publicJwk))
        assert.isFalse(Jwk.isCompatibleWith("RS256", publicJwk))
        assert.isFalse(Jwk.isCompatibleWith("HS256", publicJwk))
        assert.isFalse(Jwk.isCompatibleWith("ES256", { ...publicJwk, use: "enc" } as typeof publicJwk))
        const oct = { kty: "oct" as const, k: "AAAA" }
        assert.isTrue(Jwk.isSymmetric(oct))
        assert.isFalse(Jwk.isSymmetric(publicJwk))
      }).pipe(Effect.runPromise))
  })

  describe("Jwt.verify allowlists", () => {
    it("rejects an algorithm outside the allowlist", () =>
      Effect.gen(function*() {
        const { privateJwk, publicJwk } = yield* Jwt.generateSigningKey()
        const token = yield* Jwt.sign({ privateJwk, payload: claims })
        const error = yield* Effect.flip(
          Jwt.verify(token, { jwks: { keys: [publicJwk] }, algorithms: ["RS256"] })
        )
        assert.strictEqual(error.reason, "BadAlgorithm")
      }).pipe(Effect.runPromise))

    it("accepts an algorithm inside the allowlist", () =>
      Effect.gen(function*() {
        const { privateJwk, publicJwk } = yield* Jwt.generateSigningKey()
        const token = yield* Jwt.sign({ privateJwk, payload: claims })
        const verified = yield* Jwt.verify(token, { jwks: { keys: [publicJwk] }, algorithms: ["ES256"] })
        assert.strictEqual(verified.sub, "sub")
      }).pipe(Effect.runPromise))

    it("verifies against a JWK Set containing a malformed key alongside the good one", () =>
      Effect.gen(function*() {
        const { privateJwk, publicJwk } = yield* Jwt.generateSigningKey()
        const token = yield* Jwt.sign({ privateJwk, payload: claims })
        // a compatible (ES256) but structurally broken key must be skipped, not fatal
        const brokenKey = { ...publicJwk, x: "!!!not-base64!!!", kid: undefined }
        const verified = yield* Jwt.verify(token, {
          jwks: { keys: [brokenKey as typeof publicJwk, publicJwk] },
          algorithms: ["ES256"]
        })
        assert.strictEqual(verified.sub, "sub")
      }).pipe(Effect.runPromise))

    it("enforces the typ header when types is supplied", () =>
      Effect.gen(function*() {
        const { privateJwk, publicJwk } = yield* Jwt.generateSigningKey()
        const token = yield* Jwt.sign({ privateJwk, payload: claims }) // typ: "JWT"
        const error = yield* Effect.flip(
          Jwt.verify(token, { jwks: { keys: [publicJwk] }, types: ["at+jwt"] })
        )
        assert.strictEqual(error.reason, "BadType")
        const ok = yield* Jwt.verify(token, { jwks: { keys: [publicJwk] }, types: ["JWT"] })
        assert.strictEqual(ok.sub, "sub")
      }).pipe(Effect.runPromise))
  })

  describe("Jws.verify hardening", () => {
    it("does not crash on a key whose algorithm mismatches (fail-closed, not defect)", () =>
      Effect.gen(function*() {
        // an RSA-PSS verify key handed to a verifier for an ES256 token:
        // crypto.subtle.verify would reject; it must be skipped, yielding InvalidJws
        const es = yield* Effect.promise(() =>
          crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])
        )
        const rsa = yield* Effect.promise(() =>
          crypto.subtle.generateKey(
            { name: "RSA-PSS", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            true,
            ["sign", "verify"]
          )
        )
        const encoded = yield* Jws.sign({ privateKeys: [{ algorithm: "ES256", key: es.privateKey }] })("hi", {})
        const jws = yield* Schema.decodeUnknownEffect(Jws.Flattened)(encoded)
        // rsa key first (would throw inside crypto.subtle.verify), then the correct es key
        const result = yield* Jws.verify({ publicKeys: [rsa.publicKey, es.publicKey] })(jws)
        assert.strictEqual(result.payload, "hi")
      }).pipe(Effect.runPromise))

    it("rejects a General JWS exceeding maxSignatures", () =>
      Effect.gen(function*() {
        const a = yield* Effect.promise(() =>
          crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])
        )
        const encoded = yield* Jws.sign({
          privateKeys: [
            { algorithm: "ES256", key: a.privateKey },
            { algorithm: "ES256", key: a.privateKey }
          ]
        })("x", {})
        const jws = yield* Schema.decodeUnknownEffect(Jws.General)(encoded)
        const error = yield* Effect.flip(Jws.verify({ publicKeys: [a.publicKey], maxSignatures: 1 })(jws))
        assert.strictEqual(error._tag, "InvalidJws")
      }).pipe(Effect.runPromise))
  })

  describe("Jwe.decrypt hardening", () => {
    const importAesKw = (bytes: Uint8Array) =>
      Effect.promise(() => crypto.subtle.importKey("raw", bytes, "AES-KW", false, ["wrapKey", "unwrapKey"]))
    const importPbkdf2 = (bytes: Uint8Array) =>
      Effect.promise(() => crypto.subtle.importKey("raw", bytes, "PBKDF2", false, ["deriveBits"]))
    const rnd = (n: number) => crypto.getRandomValues(new Uint8Array(n))

    it("bounds the PBES2 iteration count (DoS guard)", () =>
      Effect.gen(function*() {
        const key = yield* importPbkdf2(new TextEncoder().encode("pw"))
        // craft a token with an enormous p2c by editing the header of a real one
        const jwe = yield* Jwe.encrypt({
          plaintext: "secret",
          key,
          algorithm: "PBES2-HS256+A128KW",
          encryption: "A128GCM",
          p2c: 1000
        })
        const parts = jwe.split(".")
        const header = JSON.parse(new TextDecoder().decode(
          Uint8Array.from(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))
        ))
        header.p2c = 100_000_000
        const b64 = (s: string) => btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
        parts[0] = b64(JSON.stringify(header))
        const error = yield* Effect.flip(Jwe.decrypt({ jwe: parts.join("."), key }))
        assert.strictEqual(error.reason, "Malformed")
      }).pipe(Effect.runPromise))

    it("enforces key-management and content-encryption allowlists", () =>
      Effect.gen(function*() {
        const key = yield* importAesKw(rnd(16))
        const jwe = yield* Jwe.encrypt({ plaintext: "hi", key, algorithm: "A128KW", encryption: "A128GCM" })
        const e1 = yield* Effect.flip(
          Jwe.decrypt({ jwe, key, keyManagementAlgorithms: ["RSA-OAEP"] })
        )
        assert.strictEqual(e1.reason, "UnsupportedAlgorithm")
        const e2 = yield* Effect.flip(
          Jwe.decrypt({ jwe, key, contentEncryptionAlgorithms: ["A256GCM"] })
        )
        assert.strictEqual(e2.reason, "UnsupportedAlgorithm")
        // allowlist that matches still works
        const ok = yield* Jwe.decrypt({
          jwe,
          key,
          keyManagementAlgorithms: ["A128KW"],
          contentEncryptionAlgorithms: ["A128GCM"]
        })
        assert.strictEqual(new TextDecoder().decode(ok.plaintext), "hi")
      }).pipe(Effect.runPromise))

    it("rejects an unrecognized crit header (RFC 7516 4.1.13)", () =>
      Effect.gen(function*() {
        const key = yield* importAesKw(rnd(16))
        const jwe = yield* Jwe.encrypt({
          plaintext: "hi",
          key,
          algorithm: "A128KW",
          encryption: "A128GCM",
          protectedHeader: { crit: ["exp"], exp: 1 }
        })
        const error = yield* Effect.flip(Jwe.decrypt({ jwe, key }))
        assert.strictEqual(error.reason, "UnsupportedAlgorithm")
      }).pipe(Effect.runPromise))

    it("returns a typed Malformed error (not a defect) on malformed base64url", () =>
      Effect.gen(function*() {
        const key = yield* importAesKw(rnd(16))
        const jwe = yield* Jwe.encrypt({ plaintext: "hi", key, algorithm: "A128KW", encryption: "A128GCM" })
        const parts = jwe.split(".")
        parts[3] = "@@@not-base64@@@"
        const error = yield* Effect.flip(Jwe.decrypt({ jwe: parts.join("."), key }))
        assert.strictEqual(error.reason, "Malformed")
      }).pipe(Effect.runPromise))

    it("round-trips ECDH-ES with apu/apv bound into the KDF", () =>
      Effect.gen(function*() {
        const pair = yield* Effect.promise(() =>
          crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])
        )
        const jwe = yield* Jwe.encrypt({
          plaintext: "agree",
          key: pair.publicKey,
          algorithm: "ECDH-ES",
          encryption: "A128GCM",
          apu: new TextEncoder().encode("Alice"),
          apv: new TextEncoder().encode("Bob")
        })
        const result = yield* Jwe.decrypt({ jwe, key: pair.privateKey })
        assert.strictEqual(new TextDecoder().decode(result.plaintext), "agree")
        // apu/apv are carried in the protected header and bound into the KDF
        assert.isDefined((result.protectedHeader as Record<string, unknown>).apu)
        assert.isDefined((result.protectedHeader as Record<string, unknown>).apv)
      }).pipe(Effect.runPromise))

    it("rejects a dir key whose length does not match the enc CEK size", () =>
      Effect.gen(function*() {
        // A128GCM needs a 16-byte CEK; give dir a 32-byte key
        const key = yield* Effect.promise(() =>
          crypto.subtle.importKey("raw", rnd(32), { name: "HMAC", hash: "SHA-256" }, true, ["sign"])
        )
        const error = yield* Effect.flip(
          Jwe.encrypt({ plaintext: "hi", key, algorithm: "dir", encryption: "A128GCM" })
        )
        assert.strictEqual(error.reason, "KeyManagementFailed")
      }).pipe(Effect.runPromise))

    it("rejects a wrong-length CEK (typed error, not a defect)", () =>
      Effect.gen(function*() {
        // An attacker with the recipient's RSA public key can RSA-OAEP-encrypt
        // a CEK of the wrong length. It must fail closed as DecryptionFailed,
        // never reach AES importKey and crash as an unhandled defect.
        const pair = yield* Effect.promise(() =>
          crypto.subtle.generateKey(
            { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-1" },
            true,
            ["encrypt", "decrypt"]
          )
        )
        const b64 = (bytes: Uint8Array) =>
          btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
        // A128GCM needs a 16-byte CEK; wrap a 20-byte one instead
        const badCek = rnd(20)
        const wrapped = new Uint8Array(
          yield* Effect.promise(() => crypto.subtle.encrypt({ name: "RSA-OAEP" }, pair.publicKey, badCek))
        )
        const header = b64(new TextEncoder().encode(JSON.stringify({ alg: "RSA-OAEP", enc: "A128GCM" })))
        const jwe = [header, b64(wrapped), b64(rnd(12)), b64(rnd(8)), b64(rnd(16))].join(".")
        const error = yield* Effect.flip(Jwe.decrypt({ jwe, key: pair.privateKey }))
        assert.strictEqual(error.reason, "DecryptionFailed")
      }).pipe(Effect.runPromise))

    it("returns a typed error (not a defect) when a dir key cannot be exported", () =>
      Effect.gen(function*() {
        // An attacker picks alg:"dir" but the recipient key is an RSA private
        // key, which crypto.subtle.exportKey("raw", ...) rejects. That must fail
        // closed as a typed KeyManagementFailed, never surface as a defect.
        // Effect.flip only completes for a typed failure, so its success here
        // proves the branch no longer dies.
        const pair = yield* Effect.promise(() =>
          crypto.subtle.generateKey(
            { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            true,
            ["encrypt", "decrypt"]
          )
        )
        const b64 = (bytes: Uint8Array) =>
          btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
        const header = b64(new TextEncoder().encode(JSON.stringify({ alg: "dir", enc: "A128GCM" })))
        const jwe = [header, "", b64(rnd(12)), b64(rnd(8)), b64(rnd(16))].join(".")
        const error = yield* Effect.flip(Jwe.decrypt({ jwe, key: pair.privateKey }))
        assert.strictEqual(error.reason, "KeyManagementFailed")
      }).pipe(Effect.runPromise))
  })

  describe("Jwk.RsaPrivateKey", () => {
    it("preserves the CRT parameters of a full private key", () =>
      Effect.gen(function*() {
        const full = { kty: "RSA", n: "nnn", e: "AQAB", d: "ddd", p: "ppp", q: "qqq", dp: "dpv", dq: "dqv", qi: "qiv" }
        const decoded = yield* Schema.decodeUnknownEffect(Jwk.RsaPrivateKey)(full)
        assert.deepStrictEqual(decoded, full)
      }).pipe(Effect.runPromise))

    it("still decodes a d-only private key", () =>
      Effect.gen(function*() {
        const dOnly = { kty: "RSA", n: "nnn", e: "AQAB", d: "ddd" }
        const decoded = yield* Schema.decodeUnknownEffect(Jwk.RsaPrivateKey)(dOnly)
        assert.deepStrictEqual(decoded, dOnly)
      }).pipe(Effect.runPromise))
  })
})
