import * as Slack from "@effect/auth/oauth/providers/Slack"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"
import {
  claims,
  cryptoLayer,
  form,
  generateSigningKeys,
  metadataFor,
  oidcAuthorization,
  oidcExchange,
  providerOptions,
  seconds,
  sign,
  transport
} from "./fixtures.ts"

const metadata = {
  ...metadataFor("https://slack.com"),
  authorization_endpoint: "https://slack.com/openid/connect/authorize",
  token_endpoint: "https://slack.com/api/openid.connect.token",
  jwks_uri: "https://slack.com/openid/connect/keys",
  code_challenge_methods_supported: undefined,
  authorization_response_iss_parameter_supported: undefined
}
const discoveryUrl = metadata.issuer + "/.well-known/openid-configuration"

it.effect("captures Slack team hints and returns the verified subject independently of workspace claims", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generateSigningKeys()
    const token = yield* sign(keys.privateKey, {
      ...claims,
      iss: metadata.issuer,
      name: "Slack user",
      "https://slack.com/team_id": "T-verified",
      "https://slack.com/user_id": "U-workspace-user"
    })
    const scopes: Array<"openid" | "profile" | "email"> = ["openid", "profile"]
    const options = { ...providerOptions, scopes, team: "T-hint" }
    let grants = 0
    const client = yield* Slack.make(options).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === discoveryUrl) {
            options.team = "T-mutated"
            scopes.splice(0, scopes.length, "openid", "email")
            return Response.json(metadata)
          }
          if (request.url === metadata.token_endpoint) {
            grants++
            assert.strictEqual(form(request).get("code_verifier"), Redacted.value(oidcExchange.pkceVerifier))
            assert.isTrue(request.headers.authorization?.startsWith("Basic "))
            return Response.json({ ok: true, access_token: "private-access", token_type: "Bearer", id_token: token })
          }
          assert.strictEqual(request.url, metadata.jwks_uri)
          return Response.json({ keys: [keys.jwk] })
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
    assert.strictEqual(url.origin + url.pathname, metadata.authorization_endpoint)
    assert.strictEqual(url.searchParams.get("scope"), "openid profile")
    assert.strictEqual(url.searchParams.get("team"), "T-hint")
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")
    const result = yield* client.exchangeCode(oidcExchange)
    assert.strictEqual(result.identity.subject, claims.sub)
    assert.deepStrictEqual(Redacted.value(result.identity.profile), {
      name: "Slack user",
      "https://slack.com/team_id": "T-verified",
      "https://slack.com/user_id": "U-workspace-user"
    })
    assert.strictEqual(grants, 1)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("accepts Slack's advertised asymmetric algorithms from the default verifier policy", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generateSigningKeys("ES256")
    const token = yield* sign(keys.privateKey, { ...claims, iss: metadata.issuer }, "ES256")
    const client = yield* Slack.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === discoveryUrl) {
            return Response.json({ ...metadata, id_token_signing_alg_values_supported: ["HS256", "ES256"] })
          }
          if (request.url === metadata.token_endpoint) {
            return Response.json({ ok: true, access_token: "private-access", token_type: "Bearer", id_token: token })
          }
          assert.strictEqual(request.url, metadata.jwks_uri)
          return Response.json({ keys: [keys.jwk] })
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
    assert.strictEqual(url.searchParams.get("scope"), "openid")
    assert.isFalse(url.searchParams.has("team"))
    assert.strictEqual((yield* client.exchangeCode(oidcExchange)).identity.subject, claims.sub)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects Slack discovery outside pinned endpoints or explicit compatible capabilities", () =>
  Effect.gen(function*() {
    for (
      const change of [
        { issuer: "https://slack.com/" },
        { authorization_endpoint: "https://slack.com/unexpected" },
        { token_endpoint: "https://other.example/token" },
        { jwks_uri: "https://slack.com/unexpected" },
        { code_challenge_methods_supported: ["plain"] },
        { id_token_signing_alg_values_supported: ["HS256"] }
      ]
    ) {
      let requests = 0
      const error = yield* Slack.make(providerOptions).pipe(
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

it.effect("rejects Slack scopes without openid and empty team hints before discovery", () =>
  Effect.gen(function*() {
    let requests = 0
    for (const change of [{ scopes: ["profile"] as const }, { team: "" }]) {
      const error = yield* Slack.make({ ...providerOptions, ...change }).pipe(
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
