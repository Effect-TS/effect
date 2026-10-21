import { Auth, Http, Sessions, Strava, WebCrypto } from "@effect/auth"
import { assert, it } from "@effect/vitest"
import { Context, Effect, Layer, Redacted, Schema } from "effect"
import { Cookies } from "effect/http"

import { OperationHttpServerConfig } from "@effect/auth/internal/httpOperation/operationHttpServerConfig"
import { mutationSecurity } from "@effect/auth/internal/httpOperation/security"

const auth = Auth.make("test/cookie-policy", {
  claims: Schema.Struct({}),
  sessions: Sessions.stateless()
})

const startup = (options: Http.AuthHttpOptions<unknown, unknown, unknown>) =>
  Layer.build(
    Http.make(auth, options).operationLayer.pipe(
      Layer.provide(auth.layer),
      Layer.provide(
        Layer.succeed(Sessions.SessionSigningKeys, {
          activeKeyId: "test",
          keys: [
            { id: "test", material: Redacted.make("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA") }
          ]
        })
      ),
      Layer.provide(WebCrypto.layerWebCrypto)
    )
  )

// Requested hardening: exercise public layer acquisition, including custom cookie overrides.
it.effect.each([
  { name: "insecure HTTPS", cookie: { secure: false } },
  { name: "unprefixed secure session", cookie: { name: "app-session" } },
  { name: "unprefixed secure slots", cookie: { prefix: "app-" } }
])("rejects $name at startup", ({ cookie }) =>
  Effect.gen(function*() {
    const result = yield* startup({ origin: "https://app.example.com", cookie }).pipe(
      Effect.result
    )

    assert.containSubset(result, {
      _tag: "Failure",
      failure: { _tag: "OperationHttpConfigurationError", reason: "cookies" }
    })
  }))

it.effect("rejects strict cookies when OAuth needs a cross-site callback", () =>
  Effect.gen(function*() {
    const result = yield* startup({
      origin: "https://app.example.com",
      cookie: { sameSite: "strict" },
      oauth: {
        providers: {
          strava: Strava.provider({ clientId: "123", clientSecret: Redacted.make("test-secret") })
        }
      }
    }).pipe(Effect.result)

    assert.containSubset(result, {
      _tag: "Failure",
      failure: { _tag: "OperationHttpConfigurationError", reason: "cookies" }
    })
  }))

it.effect("keeps host-prefixed HTTPS and explicit loopback cookies usable", () =>
  Effect.gen(function*() {
    yield* startup({
      origin: "https://app.example.com",
      cookie: { name: "__Host-app-session", prefix: "__Host-app-" }
    })
    yield* startup({ origin: "http://localhost:3000", cookie: { secure: false, prefix: "app-" } })
  }))

// Shared-domain task: startup must reject invalid authority before serving requests.
it.effect.each([
  { cookie: { domain: "example.com", prefix: "__Host-app-" }, reason: "cookies" },
  { cookie: { domain: "example.com", name: "__Host-app-session" }, reason: "cookies" },
  { cookie: { domain: "example.com", secure: false }, reason: "cookies" },
  { cookie: { domain: "other.com" }, reason: "origin" },
  { cookie: { domain: "ample.com" }, reason: "origin" },
  ...[".example.com", "https://example.com", "example.com:443", "example.com/"].map((domain) => ({
    cookie: { domain },
    reason: "cookies"
  })),
  { cookie: { domain: "example.com" }, trustedOrigins: ["https://other.com"], reason: "origin" },
  { trustedOrigins: ["http://localhost:3000"], reason: "origin" }
])("rejects invalid shared-domain configuration %#", ({ reason, ...options }) =>
  Effect.gen(function*() {
    const result = yield* startup({ origin: "https://app.example.com", ...options }).pipe(
      Effect.result
    )

    assert.containSubset(result, {
      _tag: "Failure",
      failure: { _tag: "OperationHttpConfigurationError", reason }
    })
  }))

it.effect("shares every cookie and admits only listed origins with CSRF", () =>
  Effect.gen(function*() {
    const context = yield* startup({
      origin: "https://example.com",
      cookie: { domain: "example.com" },
      trustedOrigins: ["https://agent.example.com"]
    })

    const config = Context.get(context, OperationHttpServerConfig)

    for (const cookie of Object.values(config.cookies)) {
      assert.containSubset(cookie, { domain: "example.com", secure: true, path: "/" })
      assert.match(cookie.name, /^__Secure-effect-auth-/)

      const serialized = Cookies.toSetCookieHeaders(
        Cookies.setUnsafe(Cookies.empty, cookie.name, "test", cookie)
      )

      assert.include(serialized[0], "Domain=example.com")
    }
    for (const origin of ["https://example.com", "https://agent.example.com"]) {
      yield* mutationSecurity(
        new Request("https://example.com/auth/sign-out", {
          method: "POST",
          headers: { origin, "x-effect-auth-csrf": "1" }
        })
      ).pipe(Effect.provideService(OperationHttpServerConfig, config))
    }
    for (
      const headers of [
        { origin: "https://evil.example.com", "x-effect-auth-csrf": "1" },
        { origin: "https://agent.example.com" }
      ]
    ) {
      const result = yield* mutationSecurity(
        new Request("https://example.com/auth/sign-out", { method: "POST", headers })
      ).pipe(Effect.provideService(OperationHttpServerConfig, config), Effect.result)

      assert.strictEqual(result._tag, "Failure")
    }
  }))
