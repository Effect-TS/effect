import { GitHub } from "@effect/auth/oauth/providers"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import { codeInput, tokenBody } from "../fixtures.ts"
import { authorization, form, transport } from "./fixtures.ts"

const providerOptions = {
  clientId: "client",
  clientSecret: Redacted.make("client-secret"),
  redirectUri: codeInput.redirectUri
}

it.effect("exchanges GitHub codes with pinned scopes and a private typed profile", () =>
  Effect.gen(function*() {
    const user = {
      id: 42,
      login: "octocat",
      name: null,
      email: "unverified@example.test",
      avatar_url: "https://avatars.githubusercontent.com/u/42",
      access_token: "unprojected-private-value"
    }
    const raw = { ...tokenBody, scope: " user:email,\tread:user ", extension: "private-extension" }
    const requests: Array<string> = []
    const client = yield* GitHub.make({ ...providerOptions, scopes: ["read:user", "user:email"] }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests.push(request.url)
          if (request.url === "https://github.com/login/oauth/access_token") {
            const body = form(request)
            assert.strictEqual(body.get("code"), "single-use-code")
            assert.strictEqual(body.get("code_verifier"), Redacted.value(codeInput.pkceVerifier))
            assert.strictEqual(body.get("redirect_uri"), providerOptions.redirectUri)
            assert.strictEqual(body.get("client_id"), providerOptions.clientId)
            assert.strictEqual(body.get("client_secret"), "client-secret")
            return Response.json(raw)
          }
          assert.strictEqual(request.url, "https://api.github.com/user")
          assert.strictEqual(request.headers.authorization, "Bearer private-access")
          assert.strictEqual(request.headers.accept, "application/vnd.github+json")
          assert.isString(request.headers["user-agent"])
          assert.isString(request.headers["x-github-api-version"])
          return Response.json(user)
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.strictEqual(url.origin + url.pathname, "https://github.com/login/oauth/authorize")
    assert.strictEqual(url.searchParams.get("scope"), "read:user user:email")
    assert.strictEqual(url.searchParams.get("redirect_uri"), providerOptions.redirectUri)
    assert.strictEqual(url.searchParams.get("state"), "private-state")
    assert.strictEqual(url.searchParams.get("code_challenge"), authorization.codeChallenge)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")
    const result = yield* client.exchangeCode(codeInput)
    assert.strictEqual(result.identity.issuer, "https://github.com/login/oauth")
    assert.strictEqual(result.identity.subject, "42")
    assert.deepStrictEqual(Redacted.value(result.identity.profile), {
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url
    })
    assert.deepStrictEqual(Redacted.value(result.receipt.body), raw)
    assert.strictEqual(Redacted.value(result.tokens.accessToken), "private-access")
    assert.strictEqual(result.tokens.expiresIn, 60)
    assert.sameMembers(result.tokens.scope!.split(" "), ["read:user", "user:email"])
    for (const privateValue of [user.email, "private-access", "private-extension"]) {
      assert.notInclude(JSON.stringify(result), privateValue)
    }
    assert.deepStrictEqual(requests, ["https://github.com/login/oauth/access_token", "https://api.github.com/user"])
  }))

it.effect("checks GitHub receipts before normalization or profile requests", () =>
  Effect.gen(function*() {
    const success = { access_token: "private-access", token_type: "bearer", scope: "read:user" }
    const cases = [
      { status: 200, body: { error: "bad_verification_code" }, rejected: true },
      { status: 400, body: { error: "bad_verification_code" }, rejected: true },
      { status: 500, body: { error: "bad_verification_code" } },
      { status: 200, body: { ...success, error: "bad_verification_code" } },
      { status: 200, body: { ...success, expires_in: "60" } },
      { status: 200, body: { ...success, expires_in: 0 } },
      { status: 200, body: { ...success, scope: "read:user, repo" } },
      { status: 200, body: { ...success, scope: "read:user,read:user" } },
      { status: 200, body: { ...success, id_token: "private-unexpected-token" } }
    ]
    let current = cases[0]
    let exchanges = 0
    let profiles = 0
    const client = yield* GitHub.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === "https://github.com/login/oauth/access_token") {
            exchanges++
            return Response.json(current.body, { status: current.status })
          }
          profiles++
          return Response.json({ id: 42 })
        })
      )
    )
    for (const entry of cases) {
      current = entry
      const error = yield* client.exchangeCode(codeInput).pipe(Effect.flip)
      assert.strictEqual(error._tag, entry.rejected === true ? "OAuthRejected" : "OAuthUnavailable")
      if (error._tag === "OAuthRejected") assert.strictEqual(error.reason, "invalid_grant")
      assert.notInclude(JSON.stringify(error), "private-")
    }
    assert.strictEqual(exchanges, cases.length)
    assert.strictEqual(profiles, 0)
  }))

it.effect("requires an expiring GitHub receipt when requesting offline access", () =>
  Effect.gen(function*() {
    const success = { ...tokenBody, scope: "read:user" }
    let current: Record<string, unknown> = success
    let profiles = 0
    const client = yield* GitHub.make({ ...providerOptions, scopes: ["read:user", "offline_access"] }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === "https://github.com/login/oauth/access_token") return Response.json(current)
          profiles++
          return Response.json({ id: 42 })
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.strictEqual(url.searchParams.get("scope"), "read:user offline_access")
    const result = yield* client.exchangeCode(codeInput)
    assert.strictEqual(result.tokens.scope, "read:user")
    assert.strictEqual(Redacted.value(result.tokens.refreshToken!), "private-refresh")
    for (
      const invalid of [
        { ...success, refresh_token: undefined },
        { ...success, expires_in: undefined },
        { ...success, refresh_token_expires_in: undefined },
        { ...success, refresh_token_expires_in: "600" },
        { ...success, refresh_token_expires_in: 0 },
        { ...success, scope: "read:user,offline_access" }
      ]
    ) {
      current = invalid
      assert.strictEqual((yield* client.exchangeCode(codeInput).pipe(Effect.flip))._tag, "OAuthUnavailable")
    }
    assert.strictEqual(profiles, 1)
  }))
