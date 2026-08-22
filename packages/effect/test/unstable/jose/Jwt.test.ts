import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Jws from "effect/unstable/jose/Jws"
import * as Jwt from "effect/unstable/jose/Jwt"

describe("Jwt", () => {
  const claims = {
    iss: "https://issuer.example.com",
    sub: "user-123",
    aud: "my-api",
    exp: 9999999999,
    iat: 1,
    scope: "read write"
  }

  it.effect("signs and verifies an ES256 token", () =>
    Effect.gen(function*() {
      const { privateJwk, publicJwk } = yield* Jwt.generateSigningKey()
      const token = yield* Jwt.sign({ privateJwk, payload: claims })
      const verified = yield* Jwt.verify(token, {
        jwks: { keys: [publicJwk] },
        issuer: "https://issuer.example.com",
        audience: "my-api"
      })
      assert.strictEqual(verified.sub, "user-123")
      assert.strictEqual(verified.scope, "read write")
    }))

  it.effect("selects the right key from a mixed JWK Set by kid", () =>
    Effect.gen(function*() {
      const a = yield* Jwt.generateSigningKey()
      const b = yield* Jwt.generateSigningKey()
      const token = yield* Jwt.sign({ privateJwk: b.privateJwk, payload: claims })
      const verified = yield* Jwt.verify(token, { jwks: { keys: [a.publicJwk, b.publicJwk] } })
      assert.strictEqual(verified.iss, "https://issuer.example.com")
    }))

  it.effect("rejects a tampered payload", () =>
    Effect.gen(function*() {
      const { privateJwk, publicJwk } = yield* Jwt.generateSigningKey()
      const token = yield* Jwt.sign({ privateJwk, payload: claims })
      const [header, payload, signature] = token.split(".")
      const tampered = `${header}.${payload!.slice(0, -4)}AAAA.${signature}`
      const error = yield* Effect.flip(Jwt.verify(tampered, { jwks: { keys: [publicJwk] } }))
      assert.strictEqual(error.reason, "BadSignature")
    }))

  it.effect("rejects a wrong audience", () =>
    Effect.gen(function*() {
      const { privateJwk, publicJwk } = yield* Jwt.generateSigningKey()
      const token = yield* Jwt.sign({ privateJwk, payload: claims })
      const error = yield* Effect.flip(
        Jwt.verify(token, { jwks: { keys: [publicJwk] }, audience: "other-api" })
      )
      assert.strictEqual(error.reason, "BadAudience")
    }))

  it.effect("rejects an expired token", () =>
    Effect.gen(function*() {
      const { privateJwk, publicJwk } = yield* Jwt.generateSigningKey()
      // it.effect runs under TestClock at epoch 0, so anything past the
      // clock-skew allowance before that counts as expired
      const token = yield* Jwt.sign({ privateJwk, payload: { ...claims, exp: -60 } })
      const error = yield* Effect.flip(Jwt.verify(token, { jwks: { keys: [publicJwk] } }))
      assert.strictEqual(error.reason, "Expired")
    }))

  it.effect("does not trust keys embedded in the token", () =>
    Effect.gen(function*() {
      const trusted = yield* Jwt.generateSigningKey()
      const attacker = yield* Jwt.generateSigningKey()
      const key = yield* Effect.promise(() =>
        crypto.subtle.importKey(
          "jwk",
          attacker.privateJwk as JsonWebKey,
          { name: "ECDSA", namedCurve: "P-256" },
          false,
          [
            "sign"
          ]
        )
      )
      const signer = Jws.sign({
        privateKeys: [{ algorithm: "ES256" as const, key, header: { jwk: attacker.publicJwk } }]
      })
      const flattened = yield* signer(JSON.stringify(claims), {})
      const forged = `${flattened.protected}.${flattened.payload}.${flattened.signature}`
      const error = yield* Effect.flip(
        Jwt.verify(forged, { jwks: { keys: [trusted.publicJwk] } })
      )
      assert.strictEqual(error.reason, "BadSignature")
    }))
})
