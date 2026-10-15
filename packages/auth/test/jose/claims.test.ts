import { Jwk, Jwt } from "@effect/auth"
import { assert, it } from "@effect/vitest"
import { Context, Effect, Redacted, Schema, SchemaGetter } from "effect"
import { TestClock } from "effect/testing"
import * as jose from "jose"
import { cryptoLayer, independentJwt, secret, secretJwk, utf8 } from "./fixtures.ts"

// Adapted JWT verification contracts from panva/jose, plus the explicitly
// requested Schema inference and branded-subject boundary. See the shipped notices.
export const Subject = Schema.String.check(Schema.isPattern(/^user_[0-9]+$/)).pipe(
  Schema.brand("Subject")
)

export const Claims = Schema.Struct({
  sub: Subject,
  role: Schema.Literals(["admin", "member"]),
  quota: Schema.FiniteFromString
})

const registered = {
  iss: "https://issuer.example",
  aud: ["api"],
  exp: 1604416048,
  iat: 1604416018,
  nbf: 1604416028
}

const claims = { sub: "user_1", role: "member", quota: "3" }

const policy = {
  algorithms: ["HS256"] as const,
  issuer: registered.iss,
  audience: "api",
  typ: "JWT",
  maxTokenAge: 30
}

it.effect("encodes and decodes the caller's Schema while retaining registered claims", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(1604416038000)
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const Full = Schema.Struct({ ...Jwt.RegisteredClaims.fields, ...Claims.fields })
    const decoded = yield* Schema.decodeUnknownEffect(Full)({ ...claims, ...registered })
    const token = yield* Jwt.sign(Full, decoded, key, { alg: "HS256", typ: "JWT" })

    const independent = yield* Effect.promise(() =>
      jose.jwtVerify(Redacted.value(token), secret, { currentDate: new Date(1604416038000) })
    )

    assert.strictEqual(independent.payload.quota, "3")
    const verified = yield* Jwt.verify(Claims, token, key, policy)

    assert.deepStrictEqual(verified.claims, { sub: "user_1", role: "member", quota: 3 })
    assert.strictEqual(verified.registeredClaims.iss, registered.iss)
    assert.strictEqual(verified.registeredClaims.exp, registered.exp)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect(
  "rejects correctly signed invalid application claims and preserves Schema errors without input",
  () =>
    Effect.gen(function*() {
      const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
      const token = yield* independentJwt({ ...claims, role: "private-canary-value" })

      const error = yield* Jwt.verify(Claims, token, key, { algorithms: ["HS256"] }).pipe(
        Effect.flip
      )

      assert.strictEqual(error._tag, "SchemaError")
      assert.notInclude(JSON.stringify(error), "private-canary-value")
      assert.notInclude(String(error), "private-canary-value")
      const constrained = Schema.Struct({ count: Schema.Finite.check(Schema.isGreaterThan(0)) })

      const encoding = yield* Jwt.sign(constrained, { count: -1 }, key, { alg: "HS256" }).pipe(
        Effect.flip
      )

      assert.strictEqual(encoding._tag, "SchemaError")
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect("validates registered claims before the application decoder", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(1604416038000)
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")

    const token = yield* independentJwt({
      ...registered,
      ...claims,
      iss: "different",
      role: "invalid-application-role"
    })

    assert.deepInclude(yield* Jwt.verify(Claims, token, key, policy).pipe(Effect.flip), {
      _tag: "JoseClaimValidationFailed",
      claim: "iss",
      reason: "mismatch"
    })
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("checks the signature before parsing claims and labels unverified decoding", () =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")

    const malformed = yield* Effect.promise(() =>
      new jose.CompactSign(utf8("{")).setProtectedHeader({ alg: "HS256" }).sign(secret)
    )

    const parts = malformed.split(".")

    const wrong = Redacted.make(
      `${parts[0]}.${parts[1]}.${jose.base64url.encode(new Uint8Array(32))}`
    )

    assert.strictEqual(
      (yield* Jwt.verify(Claims, wrong, key, { algorithms: ["HS256"] }).pipe(Effect.flip))._tag,
      "JoseSignatureVerificationFailed"
    )
    const token = yield* independentJwt(claims)
    const unverified = yield* Jwt.decodeUnverified(token)

    assert.strictEqual(unverified._tag, "UnverifiedJwt")
    assert.deepStrictEqual(Redacted.value(unverified.claims), claims)
  }).pipe(Effect.provide(cryptoLayer)))

class Decode extends Context.Service<Decode, { readonly prefix: string }>()("test/Decode") {}
class Encode extends Context.Service<Encode, { readonly prefix: string }>()("test/Encode") {}

export const ServiceClaims = Schema.Struct({
  sub: Schema.String.pipe(
    Schema.decodeTo(Schema.String, {
      decode: SchemaGetter.transformEffect((value) => Effect.map(Decode, (service) => service.prefix + value)),
      encode: SchemaGetter.transformEffect((value) =>
        Effect.map(Encode, (service) => value.slice(service.prefix.length))
      )
    })
  )
})

it.effect("retains distinct encoding and decoding Schema services at runtime", () =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")

    const signed = yield* Jwt.sign(ServiceClaims, { sub: "user:42" }, key, { alg: "HS256" }).pipe(
      Effect.provideService(Encode, { prefix: "user:" })
    )

    const verified = yield* Jwt.verify(ServiceClaims, signed, key, { algorithms: ["HS256"] }).pipe(
      Effect.provideService(Decode, { prefix: "user:" })
    )

    assert.strictEqual(verified.claims.sub, "user:42")
  }).pipe(Effect.provide(cryptoLayer)))
