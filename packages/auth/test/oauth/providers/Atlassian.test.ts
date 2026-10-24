import * as Atlassian from "@effect/auth/oauth/providers/Atlassian"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import { codeInput, cryptoLayer, form, receipt, transport } from "../fixtures.ts"

const options = {
  clientId: "client",
  clientSecret: Redacted.make("client-secret"),
  redirectUri: codeInput.redirectUri
}
const authorization = {
  state: Redacted.make("saved-state"),
  codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
}

it.effect("uses Atlassian's authorization, token and profile contract", () =>
  Effect.gen(function*() {
    const profile = {
      "account_id": "atlassian-account",
      "name": "Ada",
      "nickname": "ada",
      "email": "ada@example.com",
      "picture": "https://example.com/avatar",
      "locale": "en",
      "account_status": "active",
      "account_type": "atlassian"
    }
    const tokenBody = {
      "access_token": "private-access",
      "token_type": "Bearer",
      "expires_in": "3600",
      "refresh_token": "private-refresh",
      "scope": ["read:me"],
      "extension": { "keep": true }
    }
    let requests = 0
    const client = yield* Atlassian.make({ ...options }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests++
          if (request.url === "https://auth.atlassian.com/oauth/token") {
            const body = form(request)
            assert.strictEqual(request.method, "POST")
            assert.strictEqual(body.get("grant_type"), "authorization_code")
            assert.strictEqual(body.get("code"), "single-use-code")
            assert.strictEqual(body.get("redirect_uri"), options.redirectUri)
            assert.strictEqual(body.get("code_verifier"), Redacted.value(codeInput.pkceVerifier))
            assert.strictEqual(body.get("client_id"), options.clientId)
            assert.strictEqual(body.get("client_secret"), "client-secret")
            return Response.json(tokenBody)
          }
          assert.strictEqual(request.url, "https://api.atlassian.com/me")
          assert.strictEqual(request.method, "GET")
          assert.strictEqual(request.headers.authorization, "Bearer private-access")

          return Response.json(profile)
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.strictEqual(url.origin + url.pathname, "https://auth.atlassian.com/authorize")
    assert.strictEqual(url.searchParams.get("scope"), "read:me")
    assert.strictEqual(url.searchParams.get("redirect_uri"), options.redirectUri)
    assert.strictEqual(url.searchParams.get("state"), "saved-state")
    assert.strictEqual(url.searchParams.get("code_challenge"), authorization.codeChallenge)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")
    assert.strictEqual(url.searchParams.get("audience"), "api.atlassian.com")
    assert.strictEqual(url.searchParams.get("prompt"), "consent")
    const result = yield* client.exchangeCode(codeInput)
    assert.strictEqual(result.identity.issuer, "https://auth.atlassian.com")
    assert.strictEqual(result.identity.subject, "atlassian-account")
    assert.deepStrictEqual(Redacted.value(result.identity.profile), profile)
    assert.deepStrictEqual(Redacted.value(result.receipt.body), Redacted.value(receipt(tokenBody).body))
    assert.strictEqual(Redacted.value(result.tokens.accessToken), "private-access")
    assert.strictEqual(result.tokens.expiresIn, 3600)
    assert.strictEqual(result.tokens.scope, "read:me")
    assert.strictEqual(Redacted.value(result.tokens.refreshToken!), "private-refresh")
    assert.strictEqual(requests, 2)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects invalid account claims", () =>
  Effect.gen(function*() {
    for (const profile of [{ "account_id": "" }, { "account_id": "valid", "name": 12 }]) {
      let requests = 0
      const client = yield* Atlassian.make(options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests++
            return Response.json(
              request.url === "https://auth.atlassian.com/oauth/token"
                ? { access_token: "private-access", token_type: "Bearer" }
                : profile
            )
          })
        )
      )
      const error = yield* client.exchangeCode(codeInput).pipe(Effect.flip)
      assert.strictEqual(error._tag, "OAuthRejected")
      if (error._tag === "OAuthRejected") assert.strictEqual(error.reason, "claims")
      assert.notInclude(JSON.stringify(error), "private")
      assert.strictEqual(requests, 2)
    }
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("keeps the consent prompt fixed and validates the scope vocabulary", () =>
  Effect.gen(function*() {
    let requests = 0
    const http = transport(() => {
      requests++
      return Response.json({})
    })
    const client = yield* Atlassian.make(options).pipe(Effect.provideService(HttpClient.HttpClient, http))
    const promptError = yield* client.authorizationUrl({ ...authorization, prompt: "login" }).pipe(Effect.flip)
    assert.strictEqual(promptError._tag, "OAuthConfigurationError")
    const scopeError = yield* Atlassian.make({
      ...options,
      scopes: ["unknown" as "read:me"]
    }).pipe(Effect.provideService(HttpClient.HttpClient, http), Effect.flip)
    assert.strictEqual(scopeError._tag, "OAuthConfigurationError")
    assert.strictEqual(requests, 0)
  }).pipe(Effect.provide(cryptoLayer)))
