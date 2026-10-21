import * as X from "@effect/auth/oauth/providers/X"
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

it.effect("uses X's authorization, token and profile contract", () =>
  Effect.gen(function*() {
    const profile = {
      "id": "123456789",
      "name": "Ada",
      "username": "ada",
      "profile_image_url": "https://example.com/avatar",
      "confirmed_email": "ada@example.com"
    }
    const tokenBody = {
      "access_token": "private-access",
      "token_type": "bearer",
      "expires_in": "7200",
      "refresh_token": "private-refresh",
      "scope": "users.read tweet.read",
      "extension": "kept"
    }
    let requests = 0
    const client = yield* X.make({ ...options }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests++
          if (request.url === "https://api.x.com/2/oauth2/token") {
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
          assert.strictEqual(request.url, "https://api.x.com/2/users/me?user.fields=confirmed_email,profile_image_url")
          assert.strictEqual(request.method, "GET")
          assert.strictEqual(request.headers.authorization, "Bearer private-access")

          return Response.json({ data: profile })
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.strictEqual(url.origin + url.pathname, "https://x.com/i/oauth2/authorize")
    assert.strictEqual(url.searchParams.get("scope"), "users.read tweet.read")
    assert.strictEqual(url.searchParams.get("redirect_uri"), options.redirectUri)
    assert.strictEqual(url.searchParams.get("state"), "saved-state")
    assert.strictEqual(url.searchParams.get("code_challenge"), authorization.codeChallenge)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")

    const result = yield* client.exchangeCode(codeInput)
    assert.strictEqual(result.identity.issuer, "https://x.com")
    assert.strictEqual(result.identity.subject, "123456789")
    assert.deepStrictEqual(Redacted.value(result.identity.profile), profile)
    assert.deepStrictEqual(Redacted.value(result.receipt.body), Redacted.value(receipt(tokenBody).body))
    assert.strictEqual(Redacted.value(result.tokens.accessToken), "private-access")
    assert.strictEqual(result.tokens.expiresIn, 7200)
    assert.strictEqual(result.tokens.scope, "users.read tweet.read")
    assert.strictEqual(Redacted.value(result.tokens.refreshToken!), "private-refresh")
    assert.strictEqual(requests, 2)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects invalid account claims", () =>
  Effect.gen(function*() {
    for (const profile of [{ "data": { "id": 123 } }, { "data": { "id": "123", "confirmed_email": null } }]) {
      let requests = 0
      const client = yield* X.make(options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests++
            return Response.json(
              request.url === "https://api.x.com/2/oauth2/token"
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
