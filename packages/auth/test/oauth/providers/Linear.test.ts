import * as Linear from "@effect/auth/oauth/providers/Linear"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
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

it("preserves the optional and bounded Linear profile fields", () => {
  const decode = Schema.decodeUnknownSync(Linear.Profile)
  assert.isFalse(Schema.is(Linear.Profile)({}))
  assert.deepStrictEqual(decode({ id: "linear-user", private_extension: true }), { id: "linear-user" })
  const profile = { id: "x".repeat(256), name: null, email: null, avatarUrl: null, displayName: null, url: null }
  assert.deepStrictEqual(decode(profile), profile)
  for (
    const fields of [
      { id: "" },
      { id: "x".repeat(257) },
      { name: "😀".repeat(129) },
      { email: "x".repeat(321) },
      { avatarUrl: "x".repeat(2049) }
    ]
  ) {
    assert.isFalse(Schema.is(Linear.Profile)({ id: "linear-user", ...fields }))
  }
})

it.effect("uses Linear's authorization, token and profile contract", () =>
  Effect.gen(function*() {
    const profile = {
      "id": "linear-user",
      "name": "Ada",
      "email": "ada@example.com",
      "avatarUrl": null,
      "displayName": "Ada L",
      "url": null
    }
    const tokenBody = {
      "access_token": "private-access",
      "token_type": "Bearer",
      "expires_in": "86400",
      "scope": "read,write",
      "extension": { "keep": true }
    }
    let requests = 0
    const client = yield* Linear.make({ ...options, scopes: ["read", "write"] }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests++
          if (request.url === "https://api.linear.app/oauth/token") {
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
          assert.strictEqual(request.url, "https://api.linear.app/graphql")
          assert.strictEqual(request.method, "POST")
          assert.strictEqual(request.headers.authorization, "Bearer private-access")
          assert.strictEqual(request.headers["content-type"], "application/json")
          assert.strictEqual(request.body._tag, "Uint8Array")
          if (request.body._tag === "Uint8Array") {
            assert.deepStrictEqual(JSON.parse(new TextDecoder().decode(request.body.body)), {
              query: "query Viewer{viewer{id name email avatarUrl displayName url}}"
            })
          }
          return Response.json({ data: { viewer: profile } })
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.strictEqual(url.origin + url.pathname, "https://linear.app/oauth/authorize")
    assert.strictEqual(url.searchParams.get("scope"), "read,write")
    assert.strictEqual(url.searchParams.get("redirect_uri"), options.redirectUri)
    assert.strictEqual(url.searchParams.get("state"), "saved-state")
    assert.strictEqual(url.searchParams.get("code_challenge"), authorization.codeChallenge)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")

    const result = yield* client.exchangeCode(codeInput)
    assert.strictEqual(result.identity.issuer, "https://linear.app")
    assert.strictEqual(result.identity.subject, "linear-user")
    assert.deepStrictEqual(Redacted.value(result.identity.profile), profile)
    assert.deepStrictEqual(Redacted.value(result.receipt.body), Redacted.value(receipt(tokenBody).body))
    assert.strictEqual(Redacted.value(result.tokens.accessToken), "private-access")
    assert.strictEqual(result.tokens.expiresIn, 86400)
    assert.strictEqual(result.tokens.scope, "read,write")

    assert.strictEqual(requests, 2)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("distinguishes GraphQL operation failures from invalid successful viewer claims", () =>
  Effect.gen(function*() {
    for (
      const { body, tag } of [
        { body: { data: { viewer: { id: "linear-user" } }, errors: [] }, tag: "OAuthUnavailable" },
        {
          body: { data: { viewer: { id: "linear-user" } }, errors: [{ message: "private failure" }] },
          tag: "OAuthUnavailable"
        },
        { body: { data: { viewer: null }, errors: null }, tag: "OAuthUnavailable" },
        { body: { errors: [{ message: "private failure" }] }, tag: "OAuthUnavailable" },
        { body: { data: { viewer: null } }, tag: "OAuthRejected" },
        { body: { data: { viewer: { id: "linear-user", email: 42 } } }, tag: "OAuthRejected" }
      ]
    ) {
      let requests = 0
      const client = yield* Linear.make(options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests++
            return Response.json(
              request.url === "https://api.linear.app/oauth/token"
                ? { access_token: "private-access", token_type: "Bearer" }
                : body
            )
          })
        )
      )
      const error = yield* client.exchangeCode(codeInput).pipe(Effect.flip)
      assert.strictEqual(error._tag, tag)
      if (error._tag === "OAuthRejected") assert.strictEqual(error.reason, "claims")
      assert.notInclude(JSON.stringify(error), "private")
      assert.strictEqual(requests, 2)
    }
  }).pipe(Effect.provide(cryptoLayer)))
