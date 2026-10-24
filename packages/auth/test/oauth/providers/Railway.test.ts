import * as Railway from "@effect/auth/oauth/providers/Railway"
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

const discoveryUrl = "https://backboard.railway.com/oauth/.well-known/openid-configuration"
const metadata = {
  ...metadataFor("https://backboard.railway.com"),
  authorization_endpoint: "https://backboard.railway.com/oauth/auth",
  token_endpoint: "https://backboard.railway.com/oauth/token",
  jwks_uri: "https://backboard.railway.com/oauth/jwks",
  userinfo_endpoint: "https://backboard.railway.com/oauth/me",
  code_challenge_methods_supported: undefined,
  id_token_signing_alg_values_supported: ["ES256"]
}

it.effect("uses Railway's published discovery URL and merges subject-bound UserInfo below verified ES256 claims", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generateSigningKeys("ES256")
    const token = yield* sign(keys.privateKey, {
      ...claims,
      iss: metadata.issuer,
      name: "Verified name",
      sid: "verified-session"
    }, "ES256")
    const requests: Array<string> = []
    const client = yield* Railway.make({ ...providerOptions, scopes: ["openid", "profile", "email"] }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests.push(request.url)
          if (request.url === discoveryUrl) return Response.json(metadata)
          if (request.url === metadata.token_endpoint) {
            assert.strictEqual(form(request).get("code_verifier"), Redacted.value(oidcExchange.pkceVerifier))
            assert.strictEqual(form(request).get("client_secret"), null)
            assert.isTrue(request.headers.authorization?.startsWith("Basic "))
            return Response.json({ access_token: "private-access", token_type: "Bearer", id_token: token })
          }
          if (request.url === metadata.jwks_uri) return Response.json({ keys: [keys.jwk] })
          assert.strictEqual(request.url, metadata.userinfo_endpoint)
          assert.strictEqual(request.headers.authorization, "Bearer private-access")
          return Response.json({
            sub: claims.sub,
            name: "UserInfo name",
            sid: "userinfo-session",
            email: "userinfo@example.com",
            email_verified: true,
            picture: "https://example.com/photo.png"
          })
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
    assert.strictEqual(url.searchParams.get("scope"), "openid profile email")
    const result = yield* client.exchangeCode(oidcExchange)
    assert.strictEqual(result.identity.subject, claims.sub)
    assert.strictEqual(result.identity.issuer, metadata.issuer)
    assert.deepStrictEqual(Redacted.value(result.identity.profile), {
      name: "Verified name",
      sid: "verified-session",
      email: "userinfo@example.com",
      email_verified: true,
      picture: "https://example.com/photo.png"
    })
    assert.deepStrictEqual(requests, [
      discoveryUrl,
      metadata.token_endpoint,
      metadata.jwks_uri,
      metadata.userinfo_endpoint
    ])
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects Railway UserInfo with a missing or mismatched subject and does not retry failures", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generateSigningKeys("ES256")
    const token = yield* sign(keys.privateKey, { ...claims, iss: metadata.issuer }, "ES256")
    let profile: object = {}
    let status = 200
    let grants = 0
    let profiles = 0
    const client = yield* Railway.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === discoveryUrl) return Response.json(metadata)
          if (request.url === metadata.token_endpoint) {
            grants++
            return Response.json({ access_token: "private-access", token_type: "Bearer", id_token: token })
          }
          if (request.url === metadata.jwks_uri) return Response.json({ keys: [keys.jwk] })
          assert.strictEqual(request.url, metadata.userinfo_endpoint)
          profiles++
          return Response.json(profile, { status })
        })
      )
    )
    for (const value of [{ name: "private-name" }, { sub: "other-user", name: "private-name" }]) {
      profile = value
      const error = yield* client.exchangeCode(oidcExchange).pipe(Effect.flip)
      assert.strictEqual(error._tag, "OAuthRejected")
      if (error._tag === "OAuthRejected") assert.strictEqual(error.reason, "claims")
      assert.notInclude(JSON.stringify(error), "private-name")
    }
    status = 503
    const error = yield* client.exchangeCode(oidcExchange).pipe(Effect.flip)
    assert.strictEqual(error._tag, "OAuthUnavailable")
    assert.strictEqual(grants, 3)
    assert.strictEqual(profiles, 3)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("does not fetch Railway UserInfo before successful nonce verification", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generateSigningKeys("ES256")
    const token = yield* sign(keys.privateKey, { ...claims, iss: metadata.issuer, nonce: "wrong-nonce" }, "ES256")
    const requests: Array<string> = []
    const client = yield* Railway.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests.push(request.url)
          if (request.url === discoveryUrl) return Response.json(metadata)
          if (request.url === metadata.token_endpoint) {
            return Response.json({ access_token: "private-access", token_type: "Bearer", id_token: token })
          }
          assert.strictEqual(request.url, metadata.jwks_uri)
          return Response.json({ keys: [keys.jwk] })
        })
      )
    )
    assert.strictEqual((yield* client.exchangeCode(oidcExchange).pipe(Effect.flip))._tag, "OAuthRejected")
    assert.notInclude(requests, metadata.userinfo_endpoint)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects Railway discovery outside pinned endpoints, issuer responses, UserInfo, and capabilities", () =>
  Effect.gen(function*() {
    for (
      const change of [
        { issuer: metadata.issuer + "/oauth" },
        { authorization_endpoint: "https://backboard.railway.com/unexpected" },
        { token_endpoint: "https://other.example/token" },
        { jwks_uri: "https://backboard.railway.com/unexpected" },
        { userinfo_endpoint: undefined },
        { authorization_response_iss_parameter_supported: false },
        { code_challenge_methods_supported: ["plain"] },
        { id_token_signing_alg_values_supported: ["RS256"] }
      ]
    ) {
      let requests = 0
      const error = yield* Railway.make(providerOptions).pipe(
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
