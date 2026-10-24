import { assert, it } from "@effect/vitest"
import * as Jose from "effect/jose"
import * as JoseError from "effect/jose/JoseError"
import * as Jwe from "effect/jose/Jwe"
import * as Jwk from "effect/jose/Jwk"
import * as Jwks from "effect/jose/Jwks"
import * as Jws from "effect/jose/Jws"
import * as Jwt from "effect/jose/Jwt"
import { createRequire } from "node:module"

it("exposes the same JOSE modules through grouped and direct entrypoints", () => {
  assert.strictEqual(Jose.Jwe, Jwe)
  assert.strictEqual(Jose.JoseError, JoseError)
  assert.strictEqual(Jose.Jwk, Jwk)
  assert.strictEqual(Jose.Jwks, Jwks)
  assert.strictEqual(Jose.Jws, Jws)
  assert.strictEqual(Jose.Jwt, Jwt)
})

it("keeps JOSE implementation helpers private", () => {
  const require = createRequire(import.meta.url)
  assert.doesNotThrow(() => require.resolve("effect/jose/Jwt"))
  assert.throws(() => require.resolve("effect/jose/internal/crypto"))
})
