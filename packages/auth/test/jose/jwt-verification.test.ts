import type { JoseError } from "@effect/auth"
import { Jwk, Jwks, Jwt } from "@effect/auth/Jose"
import { assert, it } from "@effect/vitest"
import { Effect, Redacted, Schema } from "effect"
import { TestClock } from "effect/testing"
import * as jose from "jose"
import { cryptoLayer, independentJws, independentJwt, privateJwk, publicJwk, secretJwk, utf8 } from "./fixtures.ts"

// Public contracts adapted from panva/jose test/jwt/verify.test.ts at the
// revision in ../../THIRD_PARTY_NOTICES.md. Tokens come from the independent signer;
// the application Schema deliberately does not validate registered claims.
const Claims = Schema.Record(Schema.String, Schema.Json)
const now = 1604416038

const rejectedPolicies = [
  {
    name: "missing issuer",
    claims: {},
    options: { issuer: "issuer" },
    claim: "iss",
    reason: "missing"
  },
  {
    name: "issuer outside allowlist",
    claims: { iss: "other" },
    options: { issuer: ["issuer", "alternate"] },
    claim: "iss",
    reason: "mismatch"
  },
  {
    name: "empty expected issuer is enforced",
    claims: { iss: "issuer" },
    options: { issuer: "" },
    claim: "iss",
    reason: "mismatch"
  },
  {
    name: "missing audience",
    claims: {},
    options: { audience: "api" },
    claim: "aud",
    reason: "missing"
  },
  {
    name: "audience outside allowlist",
    claims: { aud: ["other", "another"] },
    options: { audience: ["api", "alternate"] },
    claim: "aud",
    reason: "mismatch"
  },
  {
    name: "empty audience claim",
    claims: { aud: [] },
    options: { audience: "api" },
    claim: "aud",
    reason: "mismatch"
  },
  {
    name: "empty expected audience is enforced",
    claims: { aud: "api" },
    options: { audience: "" },
    claim: "aud",
    reason: "mismatch"
  },
  {
    name: "missing subject",
    claims: {},
    options: { subject: "user" },
    claim: "sub",
    reason: "missing"
  },
  {
    name: "wrong subject",
    claims: { sub: "other" },
    options: { subject: "user" },
    claim: "sub",
    reason: "mismatch"
  },
  {
    name: "empty expected subject is enforced",
    claims: { sub: "user" },
    options: { subject: "" },
    claim: "sub",
    reason: "mismatch"
  },
  {
    name: "missing issuance with maximum age",
    claims: {},
    options: { maxTokenAge: 30 },
    claim: "iat",
    reason: "missing"
  },
  {
    name: "expiration at the current second",
    claims: { exp: now },
    options: {},
    claim: "exp",
    reason: "expired"
  },
  {
    name: "expiration at the tolerance boundary",
    claims: { exp: now - 1 },
    options: { clockTolerance: 1 },
    claim: "exp",
    reason: "expired"
  },
  {
    name: "not-before beyond tolerance",
    claims: { nbf: now + 2 },
    options: { clockTolerance: 1 },
    claim: "nbf",
    reason: "notYetValid"
  },
  {
    name: "future issuance without expiration",
    claims: { iat: now + 2 },
    options: { maxTokenAge: 30, clockTolerance: 1 },
    claim: "iat",
    reason: "future"
  },
  {
    name: "future issuance with expiration",
    claims: { iat: now + 1, exp: now + 10 },
    options: { maxTokenAge: 30 },
    claim: "iat",
    reason: "future"
  },
  {
    name: "age beyond tolerance",
    claims: { iat: now - 32 },
    options: { maxTokenAge: 30, clockTolerance: 1 },
    claim: "iat",
    reason: "tooOld"
  },
  {
    name: "zero maximum age is enforced",
    claims: { iat: now - 1 },
    options: { maxTokenAge: 0 },
    claim: "iat",
    reason: "tooOld"
  }
] satisfies ReadonlyArray<{
  readonly name: string
  readonly claims: Readonly<Record<string, unknown>>
  readonly options: Omit<Jwt.VerifyOptions, "algorithms">
  readonly claim: JoseError.ClaimValidationFailed["claim"]
  readonly reason: JoseError.ClaimValidationFailed["reason"]
}>

it.effect.each(rejectedPolicies)("rejects $name", ({ claims, options, claim, reason }) =>
  Effect.gen(function*() {
    yield* TestClock.setTime(now * 1000)
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const token = yield* independentJwt(claims)

    assert.deepInclude(
      yield* Jwt.verify(Claims, token, key, { algorithms: ["HS256"], ...options }).pipe(
        Effect.flip
      ),
      { _tag: "JoseClaimValidationFailed", claim, reason }
    )
  }).pipe(Effect.provide(cryptoLayer)))

const acceptedPolicies = [
  {
    name: "issuer allowlist",
    claims: { iss: "alternate" },
    options: { issuer: ["issuer", "alternate"] }
  },
  {
    name: "scalar audience in an allowlist",
    claims: { aud: "alternate" },
    options: { audience: ["api", "alternate"] }
  },
  {
    name: "one matching audience among several",
    claims: { aud: ["other", "api"] },
    options: { audience: "api" }
  },
  {
    name: "intersecting audience lists",
    claims: { aud: ["other", "alternate"] },
    options: { audience: ["api", "alternate"] }
  },
  { name: "exact subject", claims: { sub: "user" }, options: { subject: "user" } },
  {
    name: "matching empty string claims",
    claims: { iss: "", aud: "", sub: "" },
    options: { issuer: "", audience: "", subject: "" }
  },
  { name: "expiration within tolerance", claims: { exp: now }, options: { clockTolerance: 1 } },
  { name: "not-before at the current second", claims: { nbf: now }, options: {} },
  {
    name: "not-before at tolerance boundary",
    claims: { nbf: now + 1 },
    options: { clockTolerance: 1 }
  },
  {
    name: "issuance at future tolerance boundary",
    claims: { iat: now + 1 },
    options: { maxTokenAge: 0, clockTolerance: 1 }
  },
  {
    name: "age at maximum plus tolerance",
    claims: { iat: now - 31 },
    options: { maxTokenAge: 30, clockTolerance: 1 }
  },
  { name: "fresh token with zero maximum age", claims: { iat: now }, options: { maxTokenAge: 0 } },
  { name: "issuance without an age policy", claims: { iat: now + 1 }, options: {} }
] satisfies ReadonlyArray<{
  readonly name: string
  readonly claims: Readonly<Record<string, unknown>>
  readonly options: Omit<Jwt.VerifyOptions, "algorithms">
}>

it.effect.each(acceptedPolicies)("accepts $name", ({ claims, options }) =>
  Effect.gen(function*() {
    yield* TestClock.setTime(now * 1000 + 999)
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const token = yield* independentJwt(claims)

    assert.deepStrictEqual(
      (yield* Jwt.verify(Claims, token, key, { algorithms: ["HS256"], ...options }))
        .registeredClaims,
      claims
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("requires every explicitly required registered claim without mutating the policy", () =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const token = yield* independentJwt({})

    for (const claim of ["iss", "sub", "aud", "exp", "nbf", "iat", "jti"] as const) {
      const requiredClaims = [claim]

      assert.deepInclude(
        yield* Jwt.verify(Claims, token, key, { algorithms: ["HS256"], requiredClaims }).pipe(
          Effect.flip
        ),
        { _tag: "JoseClaimValidationFailed", claim, reason: "missing" }
      )
      assert.deepStrictEqual(requiredClaims, [claim])
    }
  }).pipe(Effect.provide(cryptoLayer)))

it.effect.each([
  { name: "issuer array", claims: { iss: ["issuer"] } },
  { name: "numeric subject", claims: { sub: 1 } },
  { name: "numeric audience", claims: { aud: 1 } },
  { name: "mixed audience array", claims: { aud: ["api", 1] } },
  { name: "string expiration", claims: { exp: `${now + 30}` } },
  { name: "null not-before", claims: { nbf: null } },
  { name: "null issuance without age policy", claims: { iat: null } },
  { name: "numeric token identifier", claims: { jti: 1 } }
])("rejects a correctly signed $name", ({ claims }) =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const token = yield* independentJwt(claims)

    assert.deepInclude(yield* Jwt.verify(Claims, token, key, { algorithms: ["HS256"] }).pipe(Effect.flip), {
      _tag: "JoseClaimValidationFailed",
      claim: "registered",
      reason: "invalid"
    })
  }).pipe(Effect.provide(cryptoLayer)))

it.effect.each([
  { name: "null", payload: utf8("null") },
  { name: "array", payload: utf8("[]") },
  { name: "string", payload: utf8("\"claims\"") },
  { name: "number", payload: utf8("1") },
  { name: "boolean", payload: utf8("true") },
  { name: "malformed JSON", payload: utf8("{") },
  {
    name: "invalid UTF-8",
    payload: new Uint8Array([...utf8("{\"sub\":\"a"), 0xc0, 0xaf, ...utf8("b\"}")])
  }
])("rejects signed $name claims", ({ payload }) =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const token = yield* independentJws(payload)

    assert.deepInclude(yield* Jwt.verify(Claims, token, key, { algorithms: ["HS256"] }).pipe(Effect.flip), {
      _tag: "JoseInvalidToken",
      reason: "payload"
    })
  }).pipe(Effect.provide(cryptoLayer)))

it.effect.each([
  { actual: "JWT", expected: "application/jwt" },
  { actual: "APPLICATION/JWT", expected: "jwt" },
  { actual: "at+jwt", expected: "APPLICATION/AT+JWT" },
  { actual: "text/plain", expected: "TEXT/PLAIN" }
])("accepts token type $actual as $expected", ({ actual, expected }) =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const token = yield* independentJwt({}, { alg: "HS256", typ: actual })

    assert.strictEqual(
      (yield* Jwt.verify(Claims, token, key, { algorithms: ["HS256"], typ: expected }))
        .protectedHeader.typ,
      actual
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect.each([
  { name: "absent type", header: { alg: "HS256" }, typ: "JWT" },
  { name: "different purpose", header: { alg: "HS256", typ: "at+jwt" }, typ: "JWT" },
  {
    name: "application prefix on a complete media type",
    header: { alg: "HS256", typ: "application/text/plain" },
    typ: "text/plain"
  },
  {
    name: "complete media type against prefixed policy",
    header: { alg: "HS256", typ: "text/plain" },
    typ: "application/text/plain"
  }
])("rejects $name", ({ header, typ }) =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const token = yield* independentJwt({}, header)

    assert.deepInclude(yield* Jwt.verify(Claims, token, key, { algorithms: ["HS256"], typ }).pipe(Effect.flip), {
      _tag: "JoseClaimValidationFailed",
      claim: "typ",
      reason: "mismatch"
    })
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects invalid verification policy instead of disabling claim checks", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(now * 1000)
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const token = yield* independentJwt({ exp: now - 1, iat: now })

    const options: ReadonlyArray<Jwt.VerifyOptions> = [
      { algorithms: [] },
      { algorithms: ["HS256"], issuer: [] },
      { algorithms: ["HS256"], audience: [] },
      { algorithms: ["HS256"], typ: "" },
      ...[NaN, Infinity, -Infinity, -1].flatMap((value): Array<Jwt.VerifyOptions> => [
        { algorithms: ["HS256"], clockTolerance: value },
        { algorithms: ["HS256"], maxTokenAge: value }
      ])
    ]

    for (const policy of options) {
      assert.deepInclude(yield* Jwt.verify(Claims, token, key, policy).pipe(Effect.flip), {
        _tag: "JoseInvalidToken",
        reason: "parameters"
      })
    }
  }).pipe(Effect.provide(cryptoLayer)))

// Retains the previously reproduced issuer-policy mutation during key lookup.
it.effect("captures verification policy before the key resolver can mutate it", () =>
  Effect.gen(function*() {
    const signing = yield* Effect.promise(() => jose.importJWK(privateJwk, "ES256"))

    const token = yield* Effect.promise(() =>
      new jose.SignJWT({ iss: "https://changed.example" })
        .setProtectedHeader({ alg: "ES256" })
        .sign(signing)
    )

    const key = yield* Jwk.importPublic(publicJwk, "ES256")

    const policy = {
      algorithms: ["ES256"],
      issuer: "https://original.example"
    } satisfies Jwt.VerifyOptions

    const result = yield* Jwt.verifyWithKeySet(Claims, Redacted.make(token), policy).pipe(
      Effect.provideService(Jwks.Jwks, {
        resolve: () =>
          Effect.sync(() => {
            policy.issuer = "https://changed.example"

            return key
          })
      }),
      Effect.flip
    )

    assert.deepInclude(result, {
      _tag: "JoseClaimValidationFailed",
      claim: "iss",
      reason: "mismatch"
    })
  }).pipe(Effect.provide(cryptoLayer)))
