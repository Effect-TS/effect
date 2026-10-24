import * as Kick from "@effect/auth/oauth/providers/Kick"
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

it.effect("uses Kick's authorization, token and profile contract", () =>
  Effect.gen(function*() {
    const profile = {
      "user_id": 42,
      "name": "Ada",
      "email": "ada@example.com",
      "profile_picture": "https://example.com/avatar"
    }
    const tokenBody = {
      "access_token": "private-access",
      "token_type": "Bearer",
      "expires_in": 3600,
      "refresh_token": "private-refresh",
      "scope": "user:read",
      "extension": "kept"
    }
    let requests = 0
    const client = yield* Kick.make({ ...options }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests++
          if (request.url === "https://id.kick.com/oauth/token") {
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
          assert.strictEqual(request.url, "https://api.kick.com/public/v1/users")
          assert.strictEqual(request.method, "GET")
          assert.strictEqual(request.headers.authorization, "Bearer private-access")

          return Response.json({ data: [profile, { user_id: 99 }], message: "OK" })
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.strictEqual(url.origin + url.pathname, "https://id.kick.com/oauth/authorize")
    assert.strictEqual(url.searchParams.get("scope"), "user:read")
    assert.strictEqual(url.searchParams.get("redirect_uri"), options.redirectUri)
    assert.strictEqual(url.searchParams.get("state"), "saved-state")
    assert.strictEqual(url.searchParams.get("code_challenge"), authorization.codeChallenge)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")

    const result = yield* client.exchangeCode(codeInput)
    assert.strictEqual(result.identity.issuer, "https://id.kick.com")
    assert.strictEqual(result.identity.subject, "42")
    assert.deepStrictEqual(Redacted.value(result.identity.profile), profile)
    assert.deepStrictEqual(Redacted.value(result.receipt.body), Redacted.value(receipt(tokenBody).body))
    assert.strictEqual(Redacted.value(result.tokens.accessToken), "private-access")
    assert.strictEqual(result.tokens.expiresIn, 3600)
    assert.strictEqual(result.tokens.scope, "user:read")
    assert.strictEqual(Redacted.value(result.tokens.refreshToken!), "private-refresh")
    assert.strictEqual(requests, 2)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects empty or malformed user lists", () =>
  Effect.gen(function*() {
    for (const profile of [{ "data": [] }, { "data": [{ "user_id": 42 }, { "user_id": 0 }] }]) {
      let requests = 0
      const client = yield* Kick.make(options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests++
            return Response.json(
              request.url === "https://id.kick.com/oauth/token"
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
