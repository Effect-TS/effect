import * as Line from "@effect/auth/oauth/providers/Line"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"
import {
  claims,
  cryptoLayer,
  form,
  metadataFor,
  oidcAuthorization,
  oidcExchange,
  providerOptions,
  seconds,
  sign,
  transport
} from "./fixtures.ts"

const metadata = {
  ...metadataFor("https://access.line.me"),
  authorization_endpoint: "https://access.line.me/oauth2/v2.1/authorize",
  token_endpoint: "https://api.line.me/oauth2/v2.1/token",
  jwks_uri: "https://api.line.me/oauth2/v2.1/certs",
  code_challenge_methods_supported: undefined,
  id_token_signing_alg_values_supported: ["ES256"],
  authorization_response_iss_parameter_supported: undefined
}

it.effect("verifies LINE web tokens with the captured channel secret and uses Basic authentication and S256", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const secret = Redacted.value(providerOptions.clientSecret)
    const callerSecret = Redacted.make(secret)
    const token = yield* sign(new TextEncoder().encode(secret), {
      ...claims,
      iss: metadata.issuer,
      name: "LINE user",
      amr: ["pwd", "mfa"]
    }, "HS256")
    const requests: Array<string> = []
    const client = yield* Line.make({ ...providerOptions, clientSecret: callerSecret }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests.push(request.url)
          if (request.url === metadata.issuer + "/.well-known/openid-configuration") {
            Redacted.wipeUnsafe(callerSecret)
            return Response.json(metadata)
          }
          assert.strictEqual(request.url, metadata.token_endpoint)
          assert.isTrue(request.headers.authorization?.startsWith("Basic "))
          assert.deepStrictEqual(
            atob(request.headers.authorization.slice(6)).split(":").map(decodeURIComponent),
            [providerOptions.clientId, secret]
          )
          assert.strictEqual(form(request).get("client_secret"), null)
          assert.strictEqual(form(request).get("code_verifier"), Redacted.value(oidcExchange.pkceVerifier))
          assert.strictEqual(form(request).get("redirect_uri"), providerOptions.redirectUri)
          return Response.json({ access_token: "private-access", token_type: "Bearer", id_token: token })
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
    assert.strictEqual(url.origin + url.pathname, metadata.authorization_endpoint)
    assert.strictEqual(url.searchParams.get("scope"), "openid")
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")
    assert.strictEqual(url.searchParams.get("nonce"), "private-nonce")
    const result = yield* client.exchangeCode(oidcExchange)
    assert.strictEqual(result.identity.issuer, metadata.issuer)
    assert.strictEqual(result.identity.subject, claims.sub)
    assert.deepStrictEqual(Redacted.value(result.identity.profile), { name: "LINE user", amr: ["pwd", "mfa"] })
    assert.deepStrictEqual(requests, [metadata.issuer + "/.well-known/openid-configuration", metadata.token_endpoint])
    assert.notInclude(JSON.stringify(result), "LINE user")
    assert.strictEqual(Redacted.value(providerOptions.clientSecret), secret)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects LINE signatures, nonces, and malformed authentication references without retrying", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const key = new TextEncoder().encode(Redacted.value(providerOptions.clientSecret))
    const cases = [
      {
        token: yield* sign(new TextEncoder().encode("wrong-secret-with-at-least-32-bytes"), {
          ...claims,
          iss: metadata.issuer
        }, "HS256"),
        tag: "OAuthUnavailable"
      },
      {
        token: yield* sign(key, { ...claims, iss: metadata.issuer, nonce: "wrong-nonce" }, "HS256"),
        tag: "OAuthRejected"
      },
      { token: yield* sign(key, { ...claims, iss: metadata.issuer, amr: [42] }, "HS256"), tag: "OAuthRejected" }
    ]
    let current = cases[0]
    let grants = 0
    const client = yield* Line.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === metadata.issuer + "/.well-known/openid-configuration") return Response.json(metadata)
          assert.strictEqual(request.url, metadata.token_endpoint)
          grants++
          return Response.json({ access_token: "private-access", token_type: "Bearer", id_token: current.token })
        })
      )
    )
    for (const entry of cases) {
      current = entry
      const error = yield* client.exchangeCode(oidcExchange).pipe(Effect.flip)
      assert.strictEqual(error._tag, entry.tag)
      assert.notInclude(JSON.stringify(error), "private-")
      assert.notInclude(JSON.stringify(error), "wrong-")
    }
    assert.strictEqual(grants, cases.length)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects LINE discovery outside pinned endpoints or explicit compatible capabilities", () =>
  Effect.gen(function*() {
    for (
      const change of [
        { issuer: metadata.issuer + "/" },
        { authorization_endpoint: "https://access.line.me/unexpected" },
        { token_endpoint: "https://other.example/token" },
        { jwks_uri: "https://api.line.me/unexpected" },
        { code_challenge_methods_supported: ["plain"] },
        { id_token_signing_alg_values_supported: ["RS256"] }
      ]
    ) {
      let requests = 0
      const error = yield* Line.make(providerOptions).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => {
            requests++
            return Response.json({ ...metadata, ...change })
          })
        ),
        Effect.flip
      )
      assert.strictEqual(error._tag, "OAuthConfigurationError")
      assert.strictEqual(requests, 1)
    }
  }))

it.effect("requires an explicit LINE scope set to include openid before discovery", () =>
  Effect.gen(function*() {
    let requests = 0
    for (const scopes of [[], ["profile"], ["openid", "openid"]] as const) {
      const error = yield* Line.make({ ...providerOptions, scopes }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => {
            requests++
            return Response.json(metadata)
          })
        ),
        Effect.flip
      )
      assert.strictEqual(error._tag, "OAuthConfigurationError")
    }
    assert.strictEqual(requests, 0)
  }))
