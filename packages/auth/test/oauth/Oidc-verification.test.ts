// Claim and auth_time contracts adapted from panva/oauth4webapi v3.8.8
// test/{authorization_code,auth_time,jwt_claims}.test.ts; this
// profile additionally verifies RS256 before definite claim classification.
// MIT, Copyright Filip Skokan. Exact commits and selected case mappings in
// ../../THIRD_PARTY_NOTICES.md. Refresh continuity is an Auth-profile case.
import { createHash } from "node:crypto"

import { assert, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as CryptoError from "effect/crypto/CryptoError"
import * as Sha2 from "effect/crypto/Sha2"
import * as DateTime from "effect/DateTime"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as Scope from "effect/Scope"
import * as Struct from "effect/Struct"
import * as TestClock from "effect/testing/TestClock"
import * as jose from "jose"

import { Oidc } from "@effect/auth"
import { cryptoLayer, metadata, transport } from "./fixtures.ts"

const seconds = 2_000_000_000

function hash(value: string, algorithm: "sha256" | "sha512" = "sha256"): string {
  const digest = createHash(algorithm).update(value).digest()
  return digest.subarray(0, digest.length / 2).toString("base64url")
}

const claims = {
  iss: metadata.issuer,
  sub: "provider-subject",
  aud: "client",
  azp: "client",
  iat: seconds,
  exp: seconds + 300,
  auth_time: seconds - 10,
  nonce: "nonce",
  email: "ada@example.com",
  email_verified: true,
  hd: "example.com",
  at_hash: hash("private-access"),
  c_hash: hash("single-use-code")
}

const verification: Oidc.VerificationInput = {
  verificationStartedAt: DateTime.makeUnsafe(seconds * 1000 - 1000),
  nonce: Redacted.make("nonce"),
  maxAgeSeconds: 60,
  accessToken: Redacted.make("private-access"),
  code: Redacted.make("single-use-code")
}

const generate = Effect.promise(() => jose.generateKeyPair("RS256", { extractable: true }))

function sign(
  key: CryptoKey | Uint8Array,
  data: jose.JWTPayload,
  algorithm: Oidc.IdTokenAlgorithm = "RS256"
): Effect.Effect<Redacted.Redacted<string>> {
  return Effect.promise(() => new jose.SignJWT(data).setProtectedHeader({ alg: algorithm, kid: "key" }).sign(key)).pipe(
    Effect.map(Redacted.make)
  )
}

it.effect("requires signing-key issuer authority after pinning discovery metadata", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generate
    const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))
    const tenant = "11111111-1111-1111-1111-111111111111"
    const issuer = `https://login.microsoftonline.com/${tenant}/v2.0`
    const template = "https://login.microsoftonline.com/{tenantid}/v2.0"

    const documentUrl = "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration"

    const token = yield* sign(keys.privateKey, { ...claims, iss: issuer, tid: tenant })

    for (const keyIssuer of [undefined, template]) {
      const http = transport((request) =>
        Response.json(
          request.url === documentUrl
            ? { ...metadata, issuer: template }
            : {
              keys: [
                { ...jwk, kid: "key", ...(keyIssuer === undefined ? {} : { issuer: keyIssuer }) }
              ]
            }
        )
      )

      const discovered = yield* Oidc.discover(issuer, {
        metadataUrl: documentUrl,
        timeoutMs: 1000
      }).pipe(Effect.provideService(HttpClient.HttpClient, http))

      const verifier = yield* Oidc.makeVerifier({
        metadata: discovered,
        clientId: "client",
        timeoutMs: 1000
      }).pipe(Effect.provideService(HttpClient.HttpClient, http))

      const result = yield* verifier.verify(token, verification).pipe(Effect.result)

      if (keyIssuer === undefined) {
        assert.strictEqual(result._tag, "Failure")
        if (result._tag === "Failure") {
          assert.strictEqual(result.failure._tag, "OAuthRejected")
          if (result.failure._tag === "OAuthRejected") assert.strictEqual(result.failure.reason, "claims")
        }
      } else {
        assert.strictEqual(result._tag, "Success")
        if (result._tag === "Success") assert.strictEqual(result.success.subject, "provider-subject")
      }
    }
  }).pipe(Effect.provide(cryptoLayer)))

it.effect(
  "verifies signed OIDC claims/hashes, retains profile extensions and clamps authentication time to captured start",
  () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const keys = yield* generate
      const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))
      let calls = 0

      const verifier = yield* Oidc.makeVerifier({
        metadata,
        clientId: "client",
        timeoutMs: 1000
      }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            calls++
            assert.strictEqual(request.url, metadata.jwks_uri)

            return Response.json({ keys: [{ ...jwk, kid: "key" }] })
          })
        )
      )

      const result = yield* verifier.verify(yield* sign(keys.privateKey, claims), verification)

      assert.strictEqual(result.subject, "provider-subject")
      assert.strictEqual(result.authTime, seconds - 10)
      assert.strictEqual(Redacted.value(result.claims).hd, "example.com")
      assert.strictEqual(DateTime.toEpochMillis(result.upstreamAuthenticatedAt!), (seconds - 10) * 1000)

      const recent = yield* verifier.verify(
        yield* sign(keys.privateKey, { ...claims, auth_time: seconds }),
        verification
      )

      assert.strictEqual(DateTime.toEpochMillis(recent.upstreamAuthenticatedAt!), seconds * 1000 - 1000)
      yield* verifier.verify(
        yield* sign(keys.privateKey, { ...claims, aud: ["client"] }),
        verification
      )
      const longSubject = "s".repeat(1024)

      assert.strictEqual(
        (yield* verifier.verify(
          yield* sign(keys.privateKey, { ...claims, sub: longSubject }),
          verification
        )).subject,
        longSubject
      )
      assert.strictEqual(calls, 1)
      assert.notInclude(JSON.stringify(result), "ada@example.com")
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect(
  "rejects authenticated wrong issuer/aud/azp/time/nonce/hash claims with no clock tolerance",
  () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const keys = yield* generate
      const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))

      const verifier = yield* Oidc.makeVerifier({
        metadata,
        clientId: "client",
        timeoutMs: 1000
      }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => Response.json({ keys: [{ ...jwk, kid: "key" }] }))
        )
      )

      // This profile requires one audience even when azp names this client.
      for (
        const override of [
          { iss: metadata.issuer.slice(0, -1) },
          { aud: "other" },
          { aud: ["client", "other"] },
          { azp: "other" },
          { exp: seconds },
          { iat: seconds + 1 },
          { nbf: seconds + 1 },
          { nonce: "other" },
          { nonce: undefined },
          { auth_time: seconds + 1 },
          { auth_time: seconds - 61 },
          { auth_time: undefined },
          { at_hash: hash("other") },
          { c_hash: hash("other") },
          { sub: "" }
        ]
      ) {
        assert.strictEqual(
          (yield* verifier
            .verify(yield* sign(keys.privateKey, { ...claims, ...override }), verification)
            .pipe(Effect.flip))._tag,
          "OAuthRejected"
        )
      }
      assert.strictEqual(
        (yield* verifier
          .verify(yield* sign(keys.privateKey, claims), {
            ...verification,
            verificationStartedAt: DateTime.makeUnsafe(seconds * 1000 + 1)
          })
          .pipe(Effect.flip))._tag,
        "OAuthRejected"
      )
      assert.strictEqual(
        (yield* verifier
          .verify(yield* sign(keys.privateKey, claims), Struct.omit(verification, ["accessToken"]))
          .pipe(Effect.flip))._tag,
        "OAuthRejected"
      )
      assert.strictEqual(
        (yield* verifier
          .verify(yield* sign(keys.privateKey, claims), Struct.omit(verification, ["code"]))
          .pipe(Effect.flip))._tag,
        "OAuthRejected"
      )
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect(
  "verifies signatures before definite claim rejection and keeps key/signature faults ambiguous",
  () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const keys = yield* generate
      const other = yield* generate
      const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))

      const verifier = yield* Oidc.makeVerifier({
        metadata,
        clientId: "client",
        timeoutMs: 1000
      }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => Response.json({ keys: [{ ...jwk, kid: "key" }] }))
        )
      )

      const invalid = yield* sign(other.privateKey, {
        ...claims,
        iss: "https://attacker.example",
        exp: 0
      })

      assert.strictEqual((yield* verifier.verify(invalid, verification).pipe(Effect.flip))._tag, "OAuthUnavailable")
      assert.strictEqual(
        (yield* verifier
          .verify(Redacted.make("malformed.jwt.signature"), verification)
          .pipe(Effect.flip))._tag,
        "OAuthUnavailable"
      )

      const unavailable = yield* Oidc.makeVerifier({
        metadata,
        clientId: "client",
        timeoutMs: 1000
      }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => new Response(null, { status: 503 }))
        )
      )

      assert.strictEqual(
        (yield* unavailable
          .verify(yield* sign(keys.privateKey, claims), verification)
          .pipe(Effect.flip))._tag,
        "OAuthUnavailable"
      )
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect(
  "refresh binds subject/optional nonce/auth_time without treating old max_age as a new login",
  () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const keys = yield* generate
      const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))

      const verifier = yield* Oidc.makeVerifier({
        metadata,
        clientId: "client",
        timeoutMs: 1000
      }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => Response.json({ keys: [{ ...jwk, kid: "key" }] }))
        )
      )

      const input = {
        ...verification,
        previous: { subject: "provider-subject", authTime: seconds - 7200 }
      }

      const refreshed = {
        ...claims,
        nonce: undefined,
        auth_time: seconds - 7200,
        c_hash: undefined
      }

      assert.strictEqual(
        (yield* verifier.verify(yield* sign(keys.privateKey, refreshed), input)).subject,
        "provider-subject"
      )
      for (
        const override of [
          { sub: "different" },
          { nonce: "different" },
          { auth_time: seconds - 7199 }
        ]
      ) {
        assert.strictEqual(
          (yield* verifier
            .verify(yield* sign(keys.privateKey, { ...refreshed, ...override }), input)
            .pipe(Effect.flip))._tag,
          "OAuthRejected"
        )
      }
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect("rejects unsupported OIDC metadata and closes the issuer's scoped JWKS resolver", () =>
  Effect.gen(function*() {
    const http = transport(() => Response.json({ keys: [] }))

    for (
      const unsupported of [
        Struct.omit(metadata, ["jwks_uri"]),
        { ...metadata, code_challenge_methods_supported: ["plain"] },
        { ...metadata, id_token_signing_alg_values_supported: ["HS256"] },
        { ...metadata, response_types_supported: ["id_token"] }
      ]
    ) {
      assert.strictEqual(
        (yield* Oidc.makeVerifier({
          metadata: unsupported,
          clientId: "client",
          timeoutMs: 1000
        }).pipe(Effect.provideService(HttpClient.HttpClient, http), Effect.flip))._tag,
        "OAuthConfigurationError"
      )
    }
    const scope = yield* Scope.make()

    const verifier = yield* Oidc.makeVerifier({
      metadata,
      clientId: "client",
      timeoutMs: 1000
    }).pipe(
      Effect.provideService(Scope.Scope, scope),
      Effect.provideService(HttpClient.HttpClient, http)
    )

    yield* Scope.close(scope, Exit.void)
    const keys = yield* generate

    assert.strictEqual(
      (yield* verifier.verify(yield* sign(keys.privateKey, claims), verification).pipe(Effect.flip))
        ._tag,
      "OAuthUnavailable"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("captures verification policy before JWKS I/O", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generate
    const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))
    const entered = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()

    const http = HttpClient.transformResponse(
      transport(() => Response.json({ keys: [{ ...jwk, kid: "key" }] })),
      (effect) =>
        Effect.andThen(
          Deferred.succeed(entered, undefined),
          Effect.andThen(Deferred.await(release), effect)
        )
    )

    const verifier = yield* Oidc.makeVerifier({
      metadata,
      clientId: "client",
      timeoutMs: 1000
    }).pipe(Effect.provideService(HttpClient.HttpClient, http))

    const policy = { ...verification, nonce: Redacted.make("nonce") }
    const token = yield* sign(keys.privateKey, claims)
    const fiber = yield* verifier.verify(token, policy).pipe(Effect.forkChild)

    yield* Deferred.await(entered)
    policy.nonce = Redacted.make("substituted")
    yield* Deferred.succeed(release, undefined)
    assert.strictEqual((yield* Fiber.join(fiber)).subject, "provider-subject")
  }).pipe(Effect.provide(cryptoLayer)))

// Gate post-signature hashing and cleanup to exercise a pending claim rejection.
for (const termination of ["owner closure", "caller interruption"] as const) {
  it.effect(`${termination} interrupts and joins active OIDC verification`, () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const keys = yield* generate
      const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))

      const owner = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))

      const verifier = yield* Oidc.makeVerifier({
        metadata,
        clientId: "client",
        timeoutMs: 1000
      }).pipe(
        Effect.provideService(Scope.Scope, owner),
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => Response.json({ keys: [{ ...jwk, kid: "key" }] }))
        )
      )

      const sha2 = yield* Sha2.Sha2
      const entered = yield* Deferred.make<void>()
      const allowDigest = yield* Deferred.make<void>()
      const cleanupStarted = yield* Deferred.make<void>()
      const allowCleanup = yield* Deferred.make<void>()
      let cleanupFinished = false
      let terminationFinished = false

      const gated = Sha2.Sha2.of({
        ...sha2,
        digest: (algorithm, input) =>
          sha2.digest(algorithm, input).pipe(
            Effect.tap(() => Deferred.succeed(entered, undefined)),
            Effect.tap(() => Deferred.await(allowDigest)),
            Effect.ensuring(
              Effect.gen(function*() {
                yield* Deferred.succeed(cleanupStarted, undefined)
                yield* Deferred.await(allowCleanup)
                cleanupFinished = true
              })
            )
          )
      })

      const token = yield* sign(keys.privateKey, { ...claims, at_hash: hash("wrong-access") })

      yield* Effect.gen(function*() {
        const active = yield* verifier
          .verify(token, verification)
          .pipe(Effect.provideService(Sha2.Sha2, gated), Effect.forkChild)

        yield* Deferred.await(entered)

        const terminating = yield* (
          termination === "owner closure" ? Scope.close(owner, Exit.void) : Fiber.interrupt(active)
        ).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              terminationFinished = true
            })
          ),
          Effect.forkChild
        )

        yield* Effect.yieldNow
        assert.strictEqual(terminationFinished, false)
        yield* Deferred.succeed(allowDigest, undefined)

        assert.strictEqual(
          yield* Effect.raceFirst(
            Deferred.await(cleanupStarted).pipe(Effect.as("cleanup")),
            Fiber.join(terminating).pipe(Effect.as("terminated"))
          ),
          "cleanup"
        )
        assert.strictEqual(terminationFinished, false)
        yield* Deferred.succeed(allowCleanup, undefined)
        yield* Fiber.join(terminating)
        assert.strictEqual(cleanupFinished, true)

        if (termination === "owner closure") {
          assert.strictEqual((yield* Fiber.join(active).pipe(Effect.flip))._tag, "OAuthUnavailable")
        } else {
          const exit = yield* Fiber.await(active)

          assert.strictEqual(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause), true)
          assert.strictEqual(
            (yield* verifier.verify(yield* sign(keys.privateKey, claims), verification)).subject,
            "provider-subject"
          )
        }
      }).pipe(Effect.ensuring(Effect.gen(function*() {
        yield* Deferred.succeed(allowDigest, undefined)
        yield* Deferred.succeed(allowCleanup, undefined)
      })))
    }).pipe(Effect.provide(cryptoLayer)))
}

for (const algorithm of ["PS256", "ES256", "EdDSA"] as const) {
  it.effect(`verifies advertised ${algorithm} signatures and native hash bindings`, () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const keys = yield* Effect.promise(() => jose.generateKeyPair(algorithm, { extractable: true }))
      const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))
      const verifier = yield* Oidc.makeVerifier({
        metadata: { ...metadata, id_token_signing_alg_values_supported: [algorithm] },
        clientId: "client",
        timeoutMs: 1000
      }).pipe(Effect.provideService(
        HttpClient.HttpClient,
        transport(() => Response.json({ keys: [{ ...jwk, kid: "key", alg: algorithm }] }))
      ))
      const digest = algorithm === "EdDSA" ? "sha512" : "sha256"
      const token = yield* sign(keys.privateKey, {
        ...claims,
        at_hash: hash("private-access", digest),
        c_hash: hash("single-use-code", digest)
      }, algorithm)
      const sha2 = yield* Sha2.Sha2
      const digests: Array<string> = []
      const observed = Sha2.Sha2.of({
        ...sha2,
        digest: (algorithm, input) => {
          digests.push(algorithm)
          return sha2.digest(algorithm, input)
        }
      })
      const verified = yield* verifier.verify(token, verification).pipe(
        Effect.provideService(Sha2.Sha2, observed)
      )
      assert.strictEqual(verified.subject, claims.sub)
      const expected = algorithm === "EdDSA" ? "SHA-512" : "SHA-256"
      assert.deepStrictEqual(digests, [expected, expected])
    }).pipe(Effect.provide(cryptoLayer)))
}

it.effect("sanitizes injected Sha2 failures and rejects invalid digest lengths", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generate
    const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))
    const verifier = yield* Oidc.makeVerifier({ metadata, clientId: "client", timeoutMs: 1000 }).pipe(
      Effect.provideService(HttpClient.HttpClient, transport(() => Response.json({ keys: [{ ...jwk, kid: "key" }] })))
    )
    const token = yield* sign(keys.privateKey, claims)
    const failure = new CryptoError.CryptoError({
      algorithm: "SHA-256",
      method: "digest",
      reason: new CryptoError.Unknown({ description: "private-provider-cause" })
    })
    for (
      const digest of [
        Effect.fail(failure),
        ...[0, 31, 33].map((length) => Effect.succeed(new Uint8Array(length)))
      ]
    ) {
      const error = yield* verifier.verify(token, verification).pipe(
        Effect.provideService(Sha2.Sha2, { digest: () => digest }),
        Effect.flip
      )
      assert.strictEqual(error._tag, "OAuthUnavailable")
      assert.notInclude(JSON.stringify(error), "private-provider-cause")
      assert.notInclude(String(error), "private-provider-cause")
    }
    assert.strictEqual((yield* verifier.verify(token, verification)).subject, claims.sub)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("requires explicit strong HS256 policy and verifies without fetching keys", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const secret = "hmac-client-secret-at-least-32-bytes"
    const key = new TextEncoder().encode(secret)
    const hmacMetadata = {
      ...Struct.omit(metadata, ["jwks_uri"]),
      id_token_signing_alg_values_supported: ["HS256"]
    }
    const http = HttpClient.make(() => Effect.die("HS256 must not fetch keys"))
    for (
      const configuration of [
        {},
        { algorithms: ["HS256"] as const },
        { algorithms: ["HS256"] as const, clientSecret: Redacted.make("too-short") },
        {
          metadata: { ...metadata, id_token_signing_alg_values_supported: ["RS256", "HS256"] },
          algorithms: ["RS256", "HS256"] as const,
          clientSecret: Redacted.make(secret)
        }
      ]
    ) {
      const failure = yield* Oidc.makeVerifier({
        metadata: hmacMetadata,
        clientId: "client",
        timeoutMs: 1000,
        ...configuration
      }).pipe(Effect.provideService(HttpClient.HttpClient, http), Effect.flip)
      assert.strictEqual(failure._tag, "OAuthConfigurationError")
    }
    const verifier = yield* Oidc.makeVerifier({
      metadata: hmacMetadata,
      clientId: "client",
      algorithms: ["HS256"],
      clientSecret: Redacted.make(secret),
      timeoutMs: 1000
    }).pipe(Effect.provideService(HttpClient.HttpClient, http))
    const token = yield* sign(key, claims, "HS256")
    assert.strictEqual((yield* verifier.verify(token, verification)).subject, claims.sub)

    const invalid = yield* sign(new Uint8Array(32), { ...claims, exp: 0 }, "HS256")
    assert.strictEqual((yield* verifier.verify(invalid, verification).pipe(Effect.flip))._tag, "OAuthUnavailable")
    const rejected = yield* verifier.verify(yield* sign(key, { ...claims, exp: 0 }, "HS256"), verification).pipe(
      Effect.flip
    )
    assert.strictEqual(rejected._tag, "OAuthRejected")
    if (rejected._tag === "OAuthRejected") assert.strictEqual(rejected.reason, "claims")
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("binds tenant token issuers to GUID claims and signing-key authority", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generate
    const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))
    const tenant = "11111111-1111-1111-1111-111111111111"
    const issuer = `https://login.microsoftonline.com/${tenant}/v2.0`
    const template = "https://login.microsoftonline.com/{tenantid}/v2.0"
    const data = { ...claims, iss: issuer, tid: tenant }
    for (const keyIssuer of [undefined, "https://other.example", issuer, template]) {
      const verifier = yield* Oidc.makeVerifier({
        metadata: { ...metadata, issuer: template },
        clientId: "client",
        timeoutMs: 1000
      }).pipe(Effect.provideService(
        HttpClient.HttpClient,
        transport(() => Response.json({ keys: [{ ...jwk, kid: "key", issuer: keyIssuer }] }))
      ))
      const token = yield* sign(keys.privateKey, data)
      if (keyIssuer === undefined || keyIssuer === "https://other.example") {
        assert.strictEqual((yield* verifier.verify(token, verification).pipe(Effect.flip))._tag, "OAuthRejected")
        continue
      }
      assert.strictEqual((yield* verifier.verify(token, verification)).subject, claims.sub)
      for (
        const override of [
          { tid: undefined },
          { tid: "common" },
          { iss: `${issuer}/` },
          { tid: "22222222-2222-2222-2222-222222222222" }
        ]
      ) {
        const invalid = yield* sign(keys.privateKey, { ...data, ...override })
        assert.strictEqual((yield* verifier.verify(invalid, verification).pipe(Effect.flip))._tag, "OAuthRejected")
      }
      const refreshed = yield* sign(keys.privateKey, { ...data, nonce: undefined })
      const previous = { subject: claims.sub, authTime: claims.auth_time, issuer }
      assert.strictEqual((yield* verifier.verify(refreshed, { ...verification, previous })).subject, claims.sub)
      for (const previousIssuer of [undefined, "https://other.example"]) {
        const failure = yield* verifier.verify(refreshed, {
          ...verification,
          previous: previousIssuer === undefined
            ? Struct.omit(previous, ["issuer"])
            : { ...previous, issuer: previousIssuer }
        }).pipe(Effect.flip)
        assert.strictEqual(failure._tag, "OAuthRejected")
      }
    }
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("keeps signing-key caches isolated between verifier owners", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const first = yield* generate
    const second = yield* generate
    const firstJwk = yield* Effect.promise(() => jose.exportJWK(first.publicKey))
    const secondJwk = yield* Effect.promise(() => jose.exportJWK(second.publicKey))
    const owner = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
    let calls = 0
    const http = transport(() => {
      calls++
      return Response.json({ keys: [{ ...(calls === 1 ? firstJwk : secondJwk), kid: "key" }] })
    })
    const install = Oidc.makeVerifier({ metadata, clientId: "client", timeoutMs: 1000 }).pipe(
      Effect.provideService(HttpClient.HttpClient, http)
    )
    const firstVerifier = yield* install.pipe(Effect.provideService(Scope.Scope, owner))
    const firstToken = yield* sign(first.privateKey, claims)
    yield* firstVerifier.verify(firstToken, verification)
    yield* firstVerifier.verify(firstToken, verification)
    assert.strictEqual(calls, 1)
    yield* Scope.close(owner, Exit.void)
    assert.strictEqual(
      (yield* firstVerifier.verify(firstToken, verification).pipe(Effect.flip))._tag,
      "OAuthUnavailable"
    )
    assert.strictEqual(calls, 1)

    const secondVerifier = yield* install
    assert.strictEqual(
      (yield* secondVerifier.verify(yield* sign(second.privateKey, claims), verification)).subject,
      claims.sub
    )
    assert.strictEqual(calls, 2)
    assert.strictEqual(
      (yield* secondVerifier.verify(firstToken, verification).pipe(Effect.flip))._tag,
      "OAuthUnavailable"
    )
  }).pipe(Effect.provide(cryptoLayer)))

for (const boundary of ["expiration", "authentication age"] as const) {
  it.effect(`rechecks ${boundary} after native hash I/O`, () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(seconds * 1000)
      const keys = yield* generate
      const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))
      const verifier = yield* Oidc.makeVerifier({ metadata, clientId: "client", timeoutMs: 1000 }).pipe(
        Effect.provideService(HttpClient.HttpClient, transport(() => Response.json({ keys: [{ ...jwk, kid: "key" }] })))
      )
      const sha2 = yield* Sha2.Sha2
      const delayed = Sha2.Sha2.of({
        ...sha2,
        digest: (algorithm, input) => sha2.digest(algorithm, input).pipe(Effect.tap(() => TestClock.adjust(2000)))
      })
      const token = yield* sign(keys.privateKey, {
        ...claims,
        c_hash: undefined,
        ...(boundary === "expiration" ? { exp: seconds + 1 } : { auth_time: seconds - 60 })
      })
      const failure = yield* verifier.verify(token, verification).pipe(
        Effect.provideService(Sha2.Sha2, delayed),
        Effect.flip
      )
      assert.strictEqual(failure._tag, "OAuthRejected")
      if (failure._tag === "OAuthRejected") assert.strictEqual(failure.reason, "claims")
    }).pipe(Effect.provide(cryptoLayer)))
}
