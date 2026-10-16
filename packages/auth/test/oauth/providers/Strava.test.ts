import type { OAuth } from "@effect/auth/oauth"
import * as Strava from "@effect/auth/oauth/providers/Strava"
import { assert, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientError from "effect/http/HttpClientError"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Redacted from "effect/Redacted"
import * as Scope from "effect/Scope"
import * as TestClock from "effect/testing/TestClock"

import { form, transport } from "../fixtures.ts"

const seconds = 2_000_000_000
const options: Strava.Options = {
  clientId: "1234",
  clientSecret: Redacted.make("private-secret"),
  redirectUri: "https://app.example/callback/strava"
}
const athlete = { id: 123, firstname: "Strava", lastname: "Athlete", profile: "avatar/athlete/large.png" }
const token = {
  token_type: "Bearer",
  access_token: "private-access",
  refresh_token: "private-refresh",
  expires_at: seconds + 300,
  expires_in: 600,
  athlete,
  scope: "read,activity:read"
}

it.effect("authorizes Strava with comma scopes and exchanges without PKCE using post-body credentials", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    let requests = 0
    const secret = Redacted.make("private-secret")
    const scopes: Array<"read" | "activity:read"> = ["read", "activity:read"]
    const client = yield* Strava.make({ ...options, clientSecret: secret, scopes }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests++
          assert.strictEqual(request.method, "POST")
          assert.strictEqual(request.url, "https://www.strava.com/oauth/token")
          assert.strictEqual(request.headers.authorization, undefined)
          assert.strictEqual(request.headers["content-type"], "application/x-www-form-urlencoded;charset=UTF-8")
          assert.deepStrictEqual(Object.fromEntries(form(request)), {
            grant_type: "authorization_code",
            code: "private-code",
            redirect_uri: options.redirectUri,
            client_id: options.clientId,
            client_secret: "private-secret"
          })
          return Response.json(token)
        })
      )
    )
    Redacted.wipeUnsafe(secret)
    scopes.push("read")
    const state = Redacted.make("private-state")
    const url = new URL(Redacted.value(yield* client.authorizationUrl({ state })))
    assert.strictEqual(url.origin + url.pathname, "https://www.strava.com/oauth/authorize")
    assert.strictEqual(url.searchParams.get("client_id"), options.clientId)
    assert.strictEqual(url.searchParams.get("redirect_uri"), options.redirectUri)
    assert.strictEqual(url.searchParams.get("response_type"), "code")
    assert.strictEqual(url.searchParams.get("approval_prompt"), "auto")
    assert.strictEqual(url.searchParams.get("scope"), "read,activity:read")
    assert.strictEqual(url.searchParams.get("state"), "private-state")
    assert.strictEqual(url.searchParams.get("code_challenge"), null)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), null)
    const code = Redacted.make("private-code")
    const result = yield* client.exchangeCode({ code })
    assert.strictEqual(requests, 1)
    assert.strictEqual(Redacted.value(code), "private-code")
    assert.strictEqual(Redacted.value(state), "private-state")
    assert.strictEqual(result.tokens.expiresIn, 300)
    assert.strictEqual(result.tokens.scope, "read activity:read")
    assert.strictEqual(Redacted.value(result.tokens.refreshToken!), "private-refresh")
    assert.strictEqual(Redacted.value(result.tokens.accessToken), "private-access")
    assert.strictEqual(result.identity.issuer, "https://www.strava.com")
    assert.strictEqual(result.identity.subject, "123")
    assert.deepStrictEqual(Redacted.value(result.identity.profile), athlete)
    assert.deepStrictEqual(Redacted.value(result.receipt.body), token)
  }))

it.effect("uses only a bound callback scope fallback and gives the Strava receipt precedence", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000 + 500)
    const { scope: _, ...withoutScope } = token
    let body: OAuth.JsonObject = withoutScope
    let requests = 0
    const client = yield* Strava.make({ ...options, scopes: ["read", "activity:read"] }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport(() => {
          requests++
          return Response.json(body)
        })
      )
    )
    const input = { code: Redacted.make("code"), scope: "read,activity:read" }
    const result = yield* client.exchangeCode(input)
    assert.strictEqual(result.tokens.scope, "read activity:read")
    assert.strictEqual(result.tokens.expiresIn, 299.5)
    assert.deepStrictEqual(Redacted.value(result.receipt.body), withoutScope)
    const missing = yield* client.exchangeCode({ code: input.code }).pipe(Effect.flip)
    assert.strictEqual(missing._tag, "OAuthRejected")
    body = { ...token, scope: "read" }
    const insufficient = yield* client.exchangeCode(input).pipe(Effect.flip)
    assert.strictEqual(insufficient._tag, "OAuthRejected")
    body = { ...token, scope: "read activity:read profile:read_all" }
    const superset = yield* client.exchangeCode({ ...input, scope: "read" })
    assert.strictEqual(superset.tokens.scope, "read activity:read profile:read_all")
    for (const scope of ["read\nactivity:read", "read,unknown", "read,read", 1]) {
      const malformed = yield* client.exchangeCode({ ...input, scope } as never).pipe(Effect.flip)
      assert.strictEqual(malformed._tag, "OAuthConfigurationError")
    }
    assert.strictEqual(requests, 4)
  }))

it.effect("requires a live Strava expiry, refresh token, and valid athlete and hides grant fields", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    let body: OAuth.JsonObject = { ...token, athlete: { ...athlete, access_token: "nested-private" } }
    const client = yield* Strava.make(options).pipe(
      Effect.provideService(HttpClient.HttpClient, transport(() => Response.json(body)))
    )
    const result = yield* client.exchangeCode({ code: Redacted.make("code") })
    assert.deepStrictEqual(Redacted.value(result.identity.profile), athlete)
    assert.isFalse(JSON.stringify(result).includes("private"))
    const cases: ReadonlyArray<readonly [OAuth.JsonObject, string]> = [
      [{ ...token, expires_at: seconds }, "OAuthRejected"],
      [{ ...token, expires_at: seconds - 1 }, "OAuthRejected"],
      [{ ...token, expires_at: 0 }, "OAuthUnavailable"],
      [{ ...token, expires_at: 1.5 }, "OAuthUnavailable"],
      [{ ...token, expires_at: "2000000300" }, "OAuthUnavailable"],
      [{ ...token, refresh_token: "" }, "OAuthUnavailable"],
      [{ ...token, refresh_token: null }, "OAuthUnavailable"],
      [{ ...token, athlete: null }, "OAuthRejected"],
      [{ ...token, athlete: { id: 0 } }, "OAuthRejected"],
      [{ ...token, athlete: { id: "123" } }, "OAuthRejected"],
      [{ ...token, scope: null }, "OAuthUnavailable"],
      [{ ...token, scope: "read read" }, "OAuthUnavailable"]
    ]
    for (const testCase of cases) {
      body = testCase[0]
      const error = yield* client.exchangeCode({ code: Redacted.make("code") }).pipe(Effect.flip)
      assert.strictEqual(error._tag, testCase[1])
    }
    for (const key of ["expires_at", "refresh_token", "athlete"] as const) {
      const { [key]: _, ...missing } = token
      body = missing
      const error = yield* client.exchangeCode({ code: Redacted.make("code") }).pipe(Effect.flip)
      assert.strictEqual(error._tag, key === "athlete" ? "OAuthRejected" : "OAuthUnavailable")
    }
  }))

it.effect("requires complete recognized Strava terminal errors and never retries unknown failures", () =>
  Effect.gen(function*() {
    const terminal = {
      message: "Bad Request",
      errors: [{ resource: "AuthorizationCode", field: "code", code: "invalid" }]
    }
    const cases: ReadonlyArray<readonly [number, OAuth.JsonObject, string]> = [
      [400, terminal, "OAuthRejected"],
      [400, { error: "invalid_grant" }, "OAuthRejected"],
      [400, {}, "OAuthUnavailable"],
      [401, terminal, "OAuthUnavailable"],
      [500, terminal, "OAuthUnavailable"],
      [400, { ...terminal, errors: [] }, "OAuthUnavailable"],
      [
        400,
        { ...terminal, errors: [{ resource: "Application", field: "client_id", code: "invalid" }] },
        "OAuthUnavailable"
      ],
      [
        400,
        { ...terminal, errors: [...terminal.errors, { resource: "Unknown", field: "code", code: "invalid" }] },
        "OAuthUnavailable"
      ],
      [400, { ...terminal, athlete }, "OAuthUnavailable"],
      [400, { ...terminal, expires_at: seconds }, "OAuthUnavailable"],
      [400, { ...terminal, error: "invalid_grant" }, "OAuthUnavailable"],
      [400, { error: "invalid_grant", athlete }, "OAuthUnavailable"],
      [400, { error: "invalid_grant", error_uri: 1 }, "OAuthUnavailable"],
      [400, { error: "unknown", error_description: "private-error" }, "OAuthUnavailable"],
      [200, { ...token, ...terminal }, "OAuthUnavailable"],
      [200, { ...token, error: "invalid_grant" }, "OAuthUnavailable"],
      [200, { ...token, error_uri: "private-error" }, "OAuthUnavailable"],
      [400, token, "OAuthUnavailable"]
    ]
    let current = cases[0]
    let requests = 0
    const client = yield* Strava.make(options).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport(() => {
          requests++
          return Response.json(current[1], { status: current[0] })
        })
      )
    )
    for (const testCase of cases) {
      current = testCase
      const error = yield* client.exchangeCode({ code: Redacted.make("code") }).pipe(Effect.flip)
      assert.strictEqual(error._tag, current[2])
      assert.isFalse(JSON.stringify(error).includes("private"))
    }
    assert.strictEqual(requests, cases.length)
  }))

it.effect("validates Strava decimal client ids and requested scopes before authorization", () =>
  Effect.gen(function*() {
    let requests = 0
    const http = transport(() => {
      requests++
      return Response.json(token)
    })
    for (
      const input of [
        { ...options, clientId: "client" },
        { ...options, clientId: "1.5" },
        { ...options, clientId: "-1" },
        { ...options, scopes: [] },
        { ...options, scopes: ["read", "read"] },
        { ...options, scopes: ["unknown"] }
      ]
    ) {
      const error = yield* Strava.make(input as Strava.Options).pipe(
        Effect.provideService(HttpClient.HttpClient, http),
        Effect.flip
      )
      assert.strictEqual(error._tag, "OAuthConfigurationError")
    }
    const client = yield* Strava.make(options).pipe(Effect.provideService(HttpClient.HttpClient, http))
    const url = new URL(Redacted.value(yield* client.authorizationUrl({ state: Redacted.make("state") })))
    assert.strictEqual(url.searchParams.get("scope"), "read")
    assert.strictEqual(requests, 0)
  }))

it.effect("checks Strava expiry after response completion and owns an independent code handle", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const entered = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const code = Redacted.make("private-code")
    const client = yield* Strava.make(options).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        HttpClient.make((request) =>
          Effect.gen(function*() {
            assert.strictEqual(form(request).get("code"), "private-code")
            Redacted.wipeUnsafe(code)
            yield* Deferred.succeed(entered, undefined)
            yield* Deferred.await(release)
            return HttpClientResponse.fromWeb(request, Response.json({ ...token, expires_at: seconds + 1 }))
          })
        )
      )
    )
    const active = yield* Effect.forkChild(client.exchangeCode({ code }))
    yield* Deferred.await(entered)
    yield* TestClock.adjust(2000)
    yield* Deferred.succeed(release, undefined)
    const error = yield* Fiber.join(active).pipe(Effect.flip)
    assert.strictEqual(error._tag, "OAuthRejected")
  }))

it.effect("cancels Strava exchange work with its owner and preserves cleanup defects", () =>
  Effect.gen(function*() {
    const owner = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
    const entered = yield* Deferred.make<void>()
    const defect = { cleanup: "strava" }
    let cleaned = false
    let requests = 0
    const client = yield* Strava.make(options).pipe(
      Scope.provide(owner),
      Effect.provideService(
        HttpClient.HttpClient,
        HttpClient.make(() =>
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
      )
    )
    const active = yield* Effect.forkChild(client.exchangeCode({ code: Redacted.make("private-code") }))
    yield* Deferred.await(entered)
    yield* Scope.close(owner, Exit.void)
    const exit = yield* Fiber.await(active)
    assert.isTrue(cleaned)
    assert.isTrue(Exit.isFailure(exit))
    if (Exit.isFailure(exit)) {
      assert.isTrue(exit.cause.reasons.some((reason) => Cause.isDieReason(reason) && reason.defect === defect))
    }
    const closed = yield* client.exchangeCode({ code: Redacted.make("code") }).pipe(Effect.flip)
    assert.strictEqual(closed._tag, "OAuthUnavailable")
    assert.strictEqual(requests, 1)
  }))

it.effect("preserves all Strava transport failure reasons and cleanup defects", () =>
  Effect.gen(function*() {
    const defect = { cleanup: "strava-transport" }
    let requests = 0
    const client = yield* Strava.make(options).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        HttpClient.make((request) => {
          requests++
          const failure = new HttpClientError.HttpClientError({
            reason: new HttpClientError.TransportError({ request, cause: "private-transport" })
          })
          const secondFailure = new HttpClientError.HttpClientError({
            reason: new HttpClientError.TransportError({ request, cause: "private-second-transport" })
          })
          return Effect.failCause(Cause.combine(
            Cause.combine(Cause.fail(failure), Cause.fail(secondFailure)),
            Cause.die(defect)
          ))
        })
      )
    )
    const exit = yield* client.exchangeCode({ code: Redacted.make("code") }).pipe(Effect.exit)
    assert.isTrue(Exit.isFailure(exit))
    if (Exit.isFailure(exit)) {
      const failures = exit.cause.reasons.filter(Cause.isFailReason)
      assert.strictEqual(failures.length, 2)
      for (const reason of failures) assert.strictEqual(reason.error._tag, "OAuthUnavailable")
      assert.isFalse(JSON.stringify(failures).includes("private-transport"))
      assert.isTrue(exit.cause.reasons.some((reason) => Cause.isDieReason(reason) && reason.defect === defect))
    }
    assert.strictEqual(requests, 1)
  }))
