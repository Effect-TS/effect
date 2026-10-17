import * as Figma from "@effect/auth/oauth/providers/Figma"
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

it.effect("uses Figma's authorization, token and profile contract", () =>
  Effect.gen(function*() {
    const profile = {
      "id": "figma-user",
      "email": "ada@example.com",
      "handle": "ada",
      "img_url": "https://example.com/avatar"
    }
    const tokenBody = {
      "access_token": "private-access",
      "token_type": "bearer",
      "expires_in": 7776000,
      "refresh_token": "private-refresh",
      "scope": ["current_user:read"],
      "user_id": "receipt-user"
    }
    let requests = 0
    const client = yield* Figma.make({ ...options }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests++
          if (request.url === "https://api.figma.com/v1/oauth/token") {
            const body = form(request)
            assert.strictEqual(request.method, "POST")
            assert.strictEqual(body.get("grant_type"), "authorization_code")
            assert.strictEqual(body.get("code"), "single-use-code")
            assert.strictEqual(body.get("redirect_uri"), options.redirectUri)
            assert.strictEqual(body.get("code_verifier"), Redacted.value(codeInput.pkceVerifier))
            assert.match(request.headers.authorization, /^Basic /)
            assert.isNull(body.get("client_secret"))
            return Response.json(tokenBody)
          }
          assert.strictEqual(request.url, "https://api.figma.com/v1/me")
          assert.strictEqual(request.method, "GET")
          assert.strictEqual(request.headers.authorization, "Bearer private-access")

          return Response.json(profile)
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.strictEqual(url.origin + url.pathname, "https://www.figma.com/oauth")
    assert.strictEqual(url.searchParams.get("scope"), "current_user:read")
    assert.strictEqual(url.searchParams.get("redirect_uri"), options.redirectUri)
    assert.strictEqual(url.searchParams.get("state"), "saved-state")
    assert.strictEqual(url.searchParams.get("code_challenge"), authorization.codeChallenge)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")

    const result = yield* client.exchangeCode(codeInput)
    assert.strictEqual(result.identity.issuer, "https://www.figma.com")
    assert.strictEqual(result.identity.subject, "figma-user")
    assert.deepStrictEqual(Redacted.value(result.identity.profile), profile)
    assert.deepStrictEqual(Redacted.value(result.receipt.body), Redacted.value(receipt(tokenBody).body))
    assert.strictEqual(Redacted.value(result.tokens.accessToken), "private-access")
    assert.strictEqual(result.tokens.expiresIn, 7776000)
    assert.strictEqual(result.tokens.scope, "current_user:read")
    assert.strictEqual(Redacted.value(result.tokens.refreshToken!), "private-refresh")
    assert.strictEqual(requests, 2)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects invalid account claims", () =>
  Effect.gen(function*() {
    for (const profile of [{ "id": "" }, { "id": 123 }]) {
      let requests = 0
      const client = yield* Figma.make(options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests++
            return Response.json(
              request.url === "https://api.figma.com/v1/oauth/token"
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
