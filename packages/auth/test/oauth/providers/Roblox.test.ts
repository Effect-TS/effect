import * as Roblox from "@effect/auth/oauth/providers/Roblox"
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
  ...metadataFor("https://apis.roblox.com/oauth/"),
  authorization_endpoint: "https://apis.roblox.com/oauth/v1/authorize",
  token_endpoint: "https://apis.roblox.com/oauth/v1/token",
  jwks_uri: "https://apis.roblox.com/oauth/v1/certs",
  code_challenge_methods_supported: undefined,
  id_token_signing_alg_values_supported: ["ES256"],
  authorization_response_iss_parameter_supported: undefined
}
const discoveryUrl = metadata.issuer + ".well-known/openid-configuration"

it.effect("verifies Roblox ES256 tokens and preserves its trailing-slash issuer and account metadata", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generateSigningKeys("ES256")
    const token = yield* sign(keys.privateKey, {
      ...claims,
      iss: metadata.issuer,
      preferred_username: "roblox-user",
      type: "User",
      created_at: 1_500_000_000
    }, "ES256")
    const requests: Array<string> = []
    const client = yield* Roblox.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests.push(request.url)
          if (request.url === discoveryUrl) return Response.json(metadata)
          if (request.url === metadata.token_endpoint) {
            assert.strictEqual(form(request).get("code_verifier"), Redacted.value(oidcExchange.pkceVerifier))
            assert.isTrue(request.headers.authorization?.startsWith("Basic "))
            return Response.json({ access_token: "private-access", token_type: "Bearer", id_token: token })
          }
          assert.strictEqual(request.url, metadata.jwks_uri)
          return Response.json({ keys: [keys.jwk] })
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
    assert.strictEqual(url.origin + url.pathname, metadata.authorization_endpoint)
    assert.strictEqual(url.searchParams.get("scope"), "openid")
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")
    const result = yield* client.exchangeCode(oidcExchange)
    assert.strictEqual(result.identity.subject, claims.sub)
    assert.strictEqual(result.identity.issuer, "https://apis.roblox.com/oauth/")
    assert.deepStrictEqual(Redacted.value(result.identity.profile), {
      preferred_username: "roblox-user",
      type: "User",
      created_at: 1_500_000_000
    })
    assert.deepStrictEqual(requests, [discoveryUrl, metadata.token_endpoint, metadata.jwks_uri])
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects Roblox tokens with a normalized issuer, incorrect nonce, or malformed account metadata", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generateSigningKeys("ES256")
    let token = ""
    let grants = 0
    const client = yield* Roblox.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === discoveryUrl) return Response.json(metadata)
          if (request.url === metadata.token_endpoint) {
            grants++
            return Response.json({ access_token: "private-access", token_type: "Bearer", id_token: token })
          }
          assert.strictEqual(request.url, metadata.jwks_uri)
          return Response.json({ keys: [keys.jwk] })
        })
      )
    )
    for (
      const change of [
        { iss: "https://apis.roblox.com/oauth" },
        { nonce: "wrong-nonce" },
        { created_at: -1 },
        { type: 42 }
      ]
    ) {
      token = yield* sign(keys.privateKey, { ...claims, iss: metadata.issuer, ...change }, "ES256")
      const error = yield* client.exchangeCode(oidcExchange).pipe(Effect.flip)
      assert.strictEqual(error._tag, "OAuthRejected")
      assert.notInclude(JSON.stringify(error), "wrong-nonce")
    }
    assert.strictEqual(grants, 4)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects Roblox discovery outside pinned endpoints or explicit compatible capabilities", () =>
  Effect.gen(function*() {
    for (
      const change of [
        { issuer: "https://apis.roblox.com/oauth" },
        { authorization_endpoint: "https://apis.roblox.com/unexpected" },
        { token_endpoint: "https://other.example/token" },
        { jwks_uri: "https://apis.roblox.com/unexpected" },
        { code_challenge_methods_supported: ["plain"] },
        { id_token_signing_alg_values_supported: ["RS256"] }
      ]
    ) {
      let requests = 0
      const error = yield* Roblox.make(providerOptions).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            assert.strictEqual(request.url, discoveryUrl)
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

it.effect("requires a Roblox openid scope before discovery", () =>
  Effect.gen(function*() {
    let requests = 0
    const error = yield* Roblox.make({ ...providerOptions, scopes: ["profile"] }).pipe(
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
    assert.strictEqual(requests, 0)
  }))
