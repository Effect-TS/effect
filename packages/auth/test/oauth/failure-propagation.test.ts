import { OAuth, Oidc } from "@effect/auth/oauth"
import { assert, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientError from "effect/http/HttpClientError"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Redacted from "effect/Redacted"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"

import { codeInput, cryptoLayer, metadata, options } from "./fixtures.ts"

it.effect("preserves OIDC JWKS transport errors as defects when cleanup dies", () =>
  Effect.gen(function*() {
    const defect = { cleanup: "OIDC JWKS" }
    let transportError: HttpClientError.HttpClientError | undefined
    let requests = 0
    const http = HttpClient.make((request) =>
      Effect.suspend(() => {
        requests++
        transportError = new HttpClientError.HttpClientError({
          reason: new HttpClientError.TransportError({ request, cause: "private-transport-canary" })
        })
        return Effect.fail(transportError).pipe(Effect.ensuring(Effect.die(defect)))
      })
    )
    const verifier = yield* Oidc.makeVerifier({ metadata, clientId: "client", timeout: 1000 }).pipe(
      Effect.provideService(HttpClient.HttpClient, http)
    )
    // Structurally valid RS256 compact input reaches key lookup before signature verification.
    const token = Redacted.make("eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleSJ9.e30.AA")
    const exit = yield* verifier.verify(token, {
      nonce: Redacted.make("private-nonce"),
      verificationStartedAt: yield* DateTime.now
    }).pipe(Effect.exit)

    assert.isTrue(Exit.isFailure(exit))
    if (Exit.isFailure(exit)) {
      assert.isTrue(exit.cause.reasons.some((reason) => Cause.isDieReason(reason) && reason.defect === defect))
      assert.isFalse(Cause.hasFails(exit.cause))
      assert.isDefined(transportError)
      assert.isTrue(exit.cause.reasons.some((reason) => Cause.isDieReason(reason) && reason.defect === transportError))
    }
    assert.strictEqual(requests, 1)
  }).pipe(Effect.provide(cryptoLayer)))

// Control cleanup at the HTTP boundary to distinguish cancellation and timeout
// from successful cleanup. Live providers cannot reliably force these races.
for (const termination of ["owner", "caller", "timeout"] as const) {
  it.effect(`preserves OAuth cleanup defects during ${termination} termination`, () =>
    Effect.gen(function*() {
      const defect = { cleanup: termination }
      const owner = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
      const entered = yield* Deferred.make<void>()
      let requests = 0
      let cleaned = false

      const http = HttpClient.make(() =>
        Effect.sync(() => {
          requests++
        }).pipe(
          Effect.andThen(Deferred.succeed(entered, undefined)),
          Effect.andThen(Effect.never),
          Effect.ensuring(
            Effect.sync(() => {
              cleaned = true
            }).pipe(Effect.andThen(Effect.die(defect)))
          )
        )
      )
      const client = yield* OAuth.make({ ...options, timeout: 10 }).pipe(
        Effect.provideService(Scope.Scope, owner),
        Effect.provideService(HttpClient.HttpClient, http)
      )
      const active = yield* Effect.forkChild(client.codeGrant(codeInput))

      yield* Deferred.await(entered)
      if (termination === "owner") yield* Scope.close(owner, Exit.void)
      if (termination === "caller") yield* Fiber.interrupt(active)
      if (termination === "timeout") yield* TestClock.adjust(10)
      const exit = yield* Fiber.await(active)

      assert.isTrue(cleaned)
      assert.strictEqual(requests, 1)
      assert.isTrue(
        Exit.isFailure(exit) &&
          exit.cause.reasons.some((reason) => Cause.isDieReason(reason) && reason.defect === defect)
      )
    }))
}

for (const cleanupDefect of [false, true]) {
  it.effect(`recovers an empty OAuth revocation body ${cleanupDefect ? "only without a cleanup defect" : "on its own"}`, () =>
    Effect.gen(function*() {
      const defect = { cleanup: "empty body" }
      let requests = 0
      const http = HttpClient.make((request) =>
        Effect.sync(() => {
          requests++
          const response = HttpClientResponse.fromWeb(request, new Response(null, { status: 200 }))
          if (cleanupDefect) {
            Object.defineProperty(response, "stream", {
              value: response.stream.pipe(Stream.ensuring(Effect.die(defect)))
            })
          }
          return response
        })
      )
      const client = yield* OAuth.make(options).pipe(Effect.provideService(HttpClient.HttpClient, http))
      const exit = yield* client.revoke({
        token: Redacted.make("private-refresh"),
        tokenTypeHint: "refresh_token"
      }).pipe(Effect.exit)

      assert.strictEqual(requests, 1)
      if (cleanupDefect) {
        assert.isTrue(
          Exit.isFailure(exit) &&
            exit.cause.reasons.some((reason) => Cause.isDieReason(reason) && reason.defect === defect)
        )
        assert.isTrue(
          Exit.isFailure(exit) &&
            !Cause.hasFails(exit.cause) &&
            exit.cause.reasons.some((reason) =>
              Cause.isDieReason(reason) && HttpClientError.isHttpClientError(reason.defect) &&
              reason.defect.reason._tag === "EmptyBodyError"
            )
        )
      } else {
        assert.isTrue(Exit.isSuccess(exit))
      }
    }))
}
