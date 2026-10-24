import * as Dropbox from "@effect/auth/oauth/providers/Dropbox"
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

it.effect("uses Dropbox's authorization, token and profile contract", () =>
  Effect.gen(function*() {
    const profile = {
      "account_id": "dbid:account",
      "name": {
        "given_name": "Ada",
        "surname": "Lovelace",
        "familiar_name": "Ada",
        "display_name": "Ada Lovelace",
        "abbreviated_name": "AL"
      },
      "email": "ada@example.com",
      "email_verified": true,
      "disabled": false,
      "profile_photo_url": "https://example.com/avatar",
      "country": "US",
      "locale": "en"
    }
    const tokenBody = {
      "access_token": "private-access",
      "token_type": "bearer",
      "expires_in": "14400",
      "refresh_token": null,
      "scope": "account_info.read",
      "account_id": "receipt-account"
    }
    let requests = 0
    const client = yield* Dropbox.make({ ...options }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests++
          if (request.url === "https://api.dropboxapi.com/oauth2/token") {
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
          assert.strictEqual(request.url, "https://api.dropboxapi.com/2/users/get_current_account")
          assert.strictEqual(request.method, "POST")
          assert.strictEqual(request.headers.authorization, "Bearer private-access")
          assert.strictEqual(request.body._tag, "Empty")
          assert.isUndefined(request.headers["content-type"])
          return Response.json(profile)
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.strictEqual(url.origin + url.pathname, "https://www.dropbox.com/oauth2/authorize")
    assert.strictEqual(url.searchParams.get("scope"), "account_info.read")
    assert.strictEqual(url.searchParams.get("redirect_uri"), options.redirectUri)
    assert.strictEqual(url.searchParams.get("state"), "saved-state")
    assert.strictEqual(url.searchParams.get("code_challenge"), authorization.codeChallenge)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")

    const result = yield* client.exchangeCode(codeInput)
    assert.strictEqual(result.identity.issuer, "https://www.dropbox.com")
    assert.strictEqual(result.identity.subject, "dbid:account")
    assert.deepStrictEqual(Redacted.value(result.identity.profile), profile)
    assert.deepStrictEqual(Redacted.value(result.receipt.body), Redacted.value(receipt(tokenBody).body))
    assert.strictEqual(Redacted.value(result.tokens.accessToken), "private-access")
    assert.strictEqual(result.tokens.expiresIn, 14400)
    assert.strictEqual(result.tokens.scope, "account_info.read")
    assert.isUndefined(result.tokens.refreshToken)
    assert.strictEqual(requests, 2)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects disabled and malformed account claims", () =>
  Effect.gen(function*() {
    for (
      const profile of [{ "account_id": "dbid:disabled", "disabled": true }, {
        "account_id": "dbid:invalid",
        "email_verified": "true"
      }]
    ) {
      let requests = 0
      const client = yield* Dropbox.make(options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests++
            return Response.json(
              request.url === "https://api.dropboxapi.com/oauth2/token"
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

it.effect("supports Basic token authentication when configured", () =>
  Effect.gen(function*() {
    let requests = 0
    const client = yield* Dropbox.make({ ...options, tokenEndpointAuthMethod: "client_secret_basic" }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests++
          if (request.url === "https://api.dropboxapi.com/oauth2/token") {
            assert.match(request.headers.authorization, /^Basic /)
            assert.isNull(form(request).get("client_secret"))
            return Response.json({ access_token: "private-access", token_type: "Bearer" })
          }
          assert.strictEqual(request.body._tag, "Empty")
          return Response.json({ account_id: "dbid:basic" })
        })
      )
    )
    assert.strictEqual((yield* client.exchangeCode(codeInput)).identity.subject, "dbid:basic")
    assert.strictEqual(requests, 2)
  }).pipe(Effect.provide(cryptoLayer)))
