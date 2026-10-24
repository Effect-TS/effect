import { Oidc } from "@effect/auth/oauth"
import { assert, describe, it } from "@effect/vitest"
import { Cause, DateTime, Deferred, Effect, Exit, Fiber, Redacted, Schema, Scope } from "effect"
import * as Digest from "effect/crypto/Digest"
import * as Mac from "effect/crypto/Mac"
import * as Base64Url from "effect/encoding/Base64Url"
import * as HttpClient from "effect/http/HttpClient"
import { Jwk, Jwt } from "effect/jose"
import { TestClock } from "effect/testing"
import { webCryptoLayer as cryptoLayer } from "../utils/crypto.ts"
import { withNativeGate } from "../utils/nativeGate.ts"
import { metadata, transport } from "./fixtures.ts"

const seconds = 2_000_000_000
const input: Oidc.VerificationInput = {
  verificationStartedAt: DateTime.makeUnsafe(seconds * 1000),
  nonce: Redacted.make("nonce"),
  accessToken: Redacted.make("access-token")
}

const setup = Effect.gen(function*() {
  yield* TestClock.setTime(seconds * 1000)
  const pair = yield* Jwk.generateKeyPair({ algorithm: "ES256", kid: "key" })
  const key = yield* Jwk.importPrivate(pair.privateKey, "ES256")
  const digestService = yield* Digest.Digest
  const digest = yield* digestService.digest(Digest.sha256, new TextEncoder().encode("access-token"))
  const token = yield* Jwt.sign(
    Schema.Record(Schema.String, Schema.Json),
    {
      iss: metadata.issuer,
      sub: "subject",
      aud: "client",
      iat: seconds,
      exp: seconds + 300,
      nonce: "nonce",
      at_hash: Base64Url.encode(digest.subarray(0, 16))
    },
    key,
    { alg: "ES256", kid: "key" }
  )
  return { pair, token }
})

const stages = [
  { name: "JWKS import", method: "importKey", warm: false },
  { name: "JWKS export", method: "exportKey", warm: false },
  { name: "verification import", method: "importKey", warm: true },
  { name: "verification", method: "verify", warm: true },
  { name: "hash binding", method: "digest", warm: true }
] as const

describe("OIDC native operation lifecycle", { concurrent: false }, () => {
  for (const termination of ["caller interruption", "owner closure"] as const) {
    it.effect(`${termination} joins HS256 verification and preserves the caller secret`, () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(seconds * 1000)
        const secret = Redacted.make("hmac-client-secret-with-at-least-32-bytes")
        const bytes = new TextEncoder().encode(Redacted.value(secret))
        const key = yield* Jwk.importSecret(Redacted.make({ kty: "oct", k: Base64Url.encode(bytes) }), "HS256")
        const token = yield* Jwt.sign(
          Schema.Record(Schema.String, Schema.Json),
          {
            iss: metadata.issuer,
            sub: "subject",
            aud: "client",
            iat: seconds,
            exp: seconds + 300,
            nonce: "nonce"
          },
          key,
          { alg: "HS256" }
        )
        const owner = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
        const mac = yield* Mac.Mac
        const keys: Array<Mac.Key> = []
        const observed = Mac.Mac.of({
          ...mac,
          verify: Effect.fnUntraced(function*(key, tag, data) {
            keys.push(key)
            return yield* mac.verify(key, tag, data)
          })
        })
        const verifier = yield* Oidc.makeVerifier({
          metadata: { ...metadata, id_token_signing_alg_values_supported: ["HS256"] },
          clientId: "client",
          algorithms: ["HS256"],
          clientSecret: secret,
          timeout: 1000
        }).pipe(
          Effect.provideService(Scope.Scope, owner),
          Effect.provideService(HttpClient.HttpClient, HttpClient.make(() => Effect.die("HS256 must not fetch keys")))
        )
        const verify = verifier.verify(token, input).pipe(Effect.provideService(Mac.Mac, observed))

        yield* withNativeGate("verify", (gate) =>
          Effect.gen(function*() {
            const active = yield* Effect.forkChild(verify)
            yield* gate.entered
            const terminating = yield* Effect.forkChild(
              termination === "owner closure" ? Scope.close(owner, Exit.void) : Fiber.interrupt(active),
              { startImmediately: true }
            )
            yield* Effect.yieldNow
            assert.isUndefined(terminating.pollUnsafe())
            assert.deepStrictEqual(yield* Mac.toBytes(keys[0]), bytes)
            yield* gate.release
            yield* Fiber.join(terminating)
            if (termination === "owner closure") {
              assert.strictEqual((yield* Fiber.join(active).pipe(Effect.flip))._tag, "OAuthUnavailable")
            } else {
              const exit = yield* Fiber.await(active)
              assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
              assert.deepStrictEqual(yield* Mac.toBytes(keys[0]), bytes)
              assert.strictEqual((yield* verify).subject, "subject")
              yield* Scope.close(owner, Exit.void)
            }
            assert.strictEqual(Redacted.value(secret), "hmac-client-secret-with-at-least-32-bytes")
            const verificationCount = keys.length
            assert.strictEqual((yield* verify.pipe(Effect.flip))._tag, "OAuthUnavailable")
            assert.lengthOf(keys, verificationCount)
          }))
      }).pipe(Effect.provide(cryptoLayer)))
  }

  for (const stage of stages) {
    for (const termination of ["caller interruption", "owner closure"] as const) {
      it.effect(`${termination} joins pending native ${stage.name}`, () =>
        Effect.gen(function*() {
          const { pair, token } = yield* setup
          const owner = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
          let requests = 0
          const verifier = yield* Oidc.makeVerifier({
            metadata: { ...metadata, id_token_signing_alg_values_supported: ["ES256"] },
            clientId: "client",
            timeout: 1000
          }).pipe(
            Effect.provideService(Scope.Scope, owner),
            Effect.provideService(
              HttpClient.HttpClient,
              transport(() => {
                requests++
                return Response.json({ keys: [pair.publicKey] })
              })
            )
          )
          const verify = verifier.verify(token, input)
          if (stage.warm) yield* verify
          let published = false
          let finalized = false

          yield* withNativeGate(stage.method, (gate) =>
            Effect.gen(function*() {
              const active = yield* Effect.forkChild(verify.pipe(
                Effect.tap(() =>
                  Effect.sync(() => {
                    published = true
                  })
                ),
                Effect.ensuring(Effect.sync(() => {
                  finalized = true
                }))
              ))
              yield* gate.entered
              const terminating = yield* Effect.forkChild(
                termination === "owner closure" ? Scope.close(owner, Exit.void) : Fiber.interrupt(active),
                { startImmediately: true }
              )
              yield* Effect.yieldNow
              assert.isFalse(gate.isSettled())
              assert.isUndefined(terminating.pollUnsafe())
              assert.isFalse(finalized)
              yield* gate.release
              yield* Fiber.join(terminating)
              const exit = yield* Fiber.await(active)
              assert.isTrue(gate.isSettled())
              assert.isTrue(finalized)
              assert.isFalse(published)
              if (termination === "owner closure") {
                assert.strictEqual((yield* Fiber.join(active).pipe(Effect.flip))._tag, "OAuthUnavailable")
                assert.strictEqual((yield* verify.pipe(Effect.flip))._tag, "OAuthUnavailable")
              } else {
                assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
                assert.strictEqual((yield* verify).subject, "subject")
              }
              assert.strictEqual(requests, 1)
            }))
        }).pipe(Effect.provide(cryptoLayer)))
    }
  }

  for (const termination of ["caller interruption", "owner closure"] as const) {
    it.effect(`${termination} leaves JWKS network waits interruptible`, () =>
      Effect.gen(function*() {
        const { token } = yield* setup
        const owner = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
        const entered = yield* Deferred.make<void>()
        let cancelled = false
        const verifier = yield* Oidc.makeVerifier({
          metadata: { ...metadata, id_token_signing_alg_values_supported: ["ES256"] },
          clientId: "client",
          timeout: 1000
        }).pipe(
          Effect.provideService(Scope.Scope, owner),
          Effect.provideService(
            HttpClient.HttpClient,
            HttpClient.make(() =>
              Deferred.succeed(entered, undefined).pipe(
                Effect.andThen(Effect.never),
                Effect.ensuring(Effect.sync(() => {
                  cancelled = true
                }))
              )
            )
          )
        )
        const active = yield* Effect.forkChild(verifier.verify(token, input))
        yield* Deferred.await(entered)
        if (termination === "owner closure") {
          yield* Scope.close(owner, Exit.void)
          assert.strictEqual((yield* Fiber.join(active).pipe(Effect.flip))._tag, "OAuthUnavailable")
        } else {
          yield* Fiber.interrupt(active)
          const exit = yield* Fiber.await(active)
          assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
          // A cancelled waiter does not cancel the owner's shared refresh.
          assert.isFalse(cancelled)
          yield* Scope.close(owner, Exit.void)
        }
        assert.isTrue(cancelled)
      }).pipe(Effect.provide(cryptoLayer)))
  }
})
