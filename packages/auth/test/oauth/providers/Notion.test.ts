import type { OAuth } from "@effect/auth/oauth"
import * as Notion from "@effect/auth/oauth/providers/Notion"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"

import { transport } from "../fixtures.ts"

const options: Notion.Options = {
  clientId: "client",
  clientSecret: Redacted.make("secret"),
  redirectUri: "https://app.example/callback/notion"
}
const user = {
  object: "user",
  id: "notion-user",
  name: "Notion User",
  avatar_url: null,
  type: "person",
  person: { email: "user@example.com" }
} as const
const token = {
  access_token: "private-access",
  refresh_token: "private-refresh",
  owner: { type: "user", user },
  bot_id: "notion-bot",
  workspace_id: "notion-workspace",
  workspace_name: "Workspace",
  workspace_icon: null,
  duplicated_template_id: "private-template"
}

it.effect("authorizes a Notion user without scopes or PKCE and sends Basic-authenticated JSON", () =>
  Effect.gen(function*() {
    let requests = 0
    const secret = Redacted.make("secret")
    const client = yield* Notion.make({ ...options, clientSecret: secret }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests++
          assert.strictEqual(request.method, "POST")
          assert.strictEqual(request.url, "https://api.notion.com/v1/oauth/token")
          assert.strictEqual(request.headers.authorization, "Basic Y2xpZW50OnNlY3JldA==")
          assert.strictEqual(request.headers["content-type"], "application/json")
          assert.strictEqual(request.body._tag, "Uint8Array")
          if (request.body._tag === "Uint8Array") {
            assert.deepStrictEqual(JSON.parse(new TextDecoder().decode(request.body.body)), {
              grant_type: "authorization_code",
              code: "private-code",
              redirect_uri: options.redirectUri
            })
          }
          return Response.json(token)
        })
      )
    )
    Redacted.wipeUnsafe(secret)
    const state = Redacted.make("private-state")
    const url = new URL(Redacted.value(yield* client.authorizationUrl({ state })))
    assert.strictEqual(url.origin + url.pathname, "https://api.notion.com/v1/oauth/authorize")
    assert.strictEqual(url.searchParams.get("owner"), "user")
    assert.strictEqual(url.searchParams.get("client_id"), "client")
    assert.strictEqual(url.searchParams.get("redirect_uri"), options.redirectUri)
    assert.strictEqual(url.searchParams.get("response_type"), "code")
    assert.strictEqual(url.searchParams.get("state"), "private-state")
    assert.strictEqual(url.searchParams.get("scope"), null)
    assert.strictEqual(url.searchParams.get("code_challenge"), null)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), null)
    const code = Redacted.make("private-code")
    const result = yield* client.exchangeCode({ code })
    assert.strictEqual(requests, 1)
    assert.strictEqual(Redacted.value(state), "private-state")
    assert.strictEqual(Redacted.value(code), "private-code")
    assert.strictEqual(result.tokens.tokenType, "bearer")
    assert.strictEqual(Redacted.value(result.tokens.accessToken), token.access_token)
    assert.strictEqual(Redacted.value(result.tokens.refreshToken!), token.refresh_token)
    assert.strictEqual(result.identity.issuer, "https://api.notion.com")
    assert.strictEqual(result.identity.subject, user.id)
    assert.deepStrictEqual(Redacted.value(result.receipt.body), token)
    assert.isFalse(Object.hasOwn(Redacted.value(result.receipt.body), "token_type"))
    assert.deepStrictEqual(Redacted.value(result.identity.profile), {
      ...user,
      bot_id: token.bot_id,
      workspace_id: token.workspace_id,
      workspace_name: token.workspace_name,
      workspace_icon: token.workspace_icon
    })
  }))

it.effect("keeps grant material in the private Notion receipt and strips unknown profile fields", () =>
  Effect.gen(function*() {
    const body = {
      ...token,
      token_type: "Bearer",
      refresh_token: null,
      owner: {
        type: "user",
        user: {
          ...user,
          access_token: "nested-private-access",
          person: { ...user.person, refresh_token: "nested-private-refresh" }
        }
      }
    }
    const client = yield* Notion.make(options).pipe(
      Effect.provideService(HttpClient.HttpClient, transport(() => Response.json(body)))
    )
    const result = yield* client.exchangeCode({ code: Redacted.make("code") })
    assert.strictEqual(result.tokens.refreshToken, undefined)
    assert.deepStrictEqual(Redacted.value(result.receipt.body), body)
    const profile = Redacted.value(result.identity.profile)
    assert.isFalse(Object.hasOwn(profile, "access_token"))
    assert.deepStrictEqual(profile.person, user.person)
    assert.isFalse(JSON.stringify(result).includes("nested-private"))
    assert.isFalse(JSON.stringify(result).includes("private-access"))
  }))

it.effect("rejects Notion bot and workspace owners without requesting a user endpoint", () =>
  Effect.gen(function*() {
    const owners = [
      { type: "user", user: { ...user, type: "bot" } },
      { type: "workspace", workspace: true },
      { type: "user" },
      { type: "user", user: { ...user, id: "" } }
    ]
    let owner: unknown = owners[0]
    let requests = 0
    const client = yield* Notion.make(options).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests++
          assert.strictEqual(request.url, "https://api.notion.com/v1/oauth/token")
          return Response.json({ ...token, owner })
        })
      )
    )
    for (const value of owners) {
      owner = value
      const error = yield* client.exchangeCode({ code: Redacted.make("code") }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "OAuthRejected")
      if (error._tag === "OAuthRejected") assert.strictEqual(error.reason, "claims")
    }
    assert.strictEqual(requests, owners.length)
  }))

it.effect("classifies only complete Notion invalid_grant responses as definite rejections", () =>
  Effect.gen(function*() {
    const cases: ReadonlyArray<readonly [number, OAuth.JsonObject, string]> = [
      [400, { error: "invalid_grant" }, "OAuthRejected"],
      [400, { error: "invalid_grant", error_description: "private-error" }, "OAuthRejected"],
      [400, {}, "OAuthUnavailable"],
      [401, { error: "invalid_grant" }, "OAuthUnavailable"],
      [500, { error: "invalid_grant" }, "OAuthUnavailable"],
      [400, { error: "invalid_client" }, "OAuthUnavailable"],
      [400, { error: "unknown_error" }, "OAuthUnavailable"],
      [400, { error: "invalid_grant", error_description: 1 }, "OAuthUnavailable"],
      [400, { error: "invalid_grant", owner: token.owner }, "OAuthUnavailable"],
      [400, { error: "invalid_grant", workspace_id: "workspace" }, "OAuthUnavailable"],
      [400, { error: "invalid_grant", access_token: "private-access" }, "OAuthUnavailable"],
      [400, { error: "invalid_grant", code: "invalid_request" }, "OAuthUnavailable"],
      [200, { ...token, error: "invalid_grant" }, "OAuthUnavailable"],
      [200, { ...token, error_description: "private-error" }, "OAuthUnavailable"],
      [200, { ...token, token_type: null }, "OAuthUnavailable"],
      [200, { ...token, token_type: "mac" }, "OAuthUnavailable"],
      [200, { ...token, access_token: "" }, "OAuthUnavailable"]
    ]
    let current = cases[0]
    let requests = 0
    const client = yield* Notion.make(options).pipe(
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
      assert.isFalse(JSON.stringify(error).includes("private-"))
    }
    assert.strictEqual(requests, cases.length)
  }))
