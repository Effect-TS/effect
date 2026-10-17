import * as Keycloak from "@effect/auth/oauth/providers/Keycloak"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"

import { codeInput, metadata as baseMetadata, tokenBody, transport } from "../fixtures.ts"
import { claims, cryptoLayer, form, generateSigningKeys, oidcExchange, seconds, sign } from "./fixtures.ts"

const issuer = "https://keycloak.example/auth/realms/example"
const metadata = {
  ...baseMetadata,
  issuer,
  authorization_endpoint: issuer + "/protocol/openid-connect/auth",
  token_endpoint: issuer + "/protocol/openid-connect/token",
  jwks_uri: issuer + "/protocol/openid-connect/certs",
  authorization_response_iss_parameter_supported: true
}
const options: Keycloak.Options = {
  clientId: "client",
  clientSecret: Redacted.make("client-secret"),
  redirectUri: codeInput.redirectUri,
  url: "https://keycloak.example/auth/",
  realm: "example"
}
const authorization = {
  state: Redacted.make("private-state"),
  nonce: Redacted.make("private-nonce"),
  codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
}

it.effect("exchanges a signed Keycloak ID token and projects only private profile claims", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generateSigningKeys("ES256")
    const idToken = yield* sign(keys.privateKey, {
      ...claims,
      iss: issuer,
      name: "Ada",
      email: "ada@example.test",
      email_verified: true,
      private_extension: "discard-this"
    }, "ES256")
    const requests: Array<string> = []
    const client = yield* Keycloak.make({ ...options, scopes: ["openid", "email"] }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests.push(request.url)
          if (request.url.endsWith("/.well-known/openid-configuration")) {
            return Response.json({ ...metadata, id_token_signing_alg_values_supported: ["ES256"] })
          }
          if (request.url === metadata.jwks_uri) return Response.json({ keys: [keys.jwk] })
          assert.strictEqual(request.url, metadata.token_endpoint)
          assert.strictEqual(request.headers.authorization, "Basic " + btoa("client:client%2Dsecret"))
          const body = form(request)
          assert.strictEqual(body.get("grant_type"), "authorization_code")
          assert.strictEqual(body.get("code"), "single-use-code")
          assert.strictEqual(body.get("code_verifier"), Redacted.value(codeInput.pkceVerifier))
          assert.strictEqual(body.get("redirect_uri"), options.redirectUri)
          assert.isNull(body.get("client_secret"))
          return Response.json({ ...tokenBody, id_token: idToken })
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.strictEqual(url.searchParams.get("scope"), "openid email")
    const result = yield* client.exchangeCode(oidcExchange)
    assert.strictEqual(result.identity.issuer, issuer)
    assert.strictEqual(result.identity.subject, "pairwise-subject")
    assert.deepStrictEqual(Redacted.value(result.identity.profile), {
      name: "Ada",
      email: "ada@example.test",
      email_verified: true
    })
    assert.notInclude(JSON.stringify(result), "ada@example.test")
    assert.notInclude(JSON.stringify(result), "discard-this")
    assert.notInclude(JSON.stringify(result), idToken)
    assert.deepStrictEqual(requests, [
      issuer.replace(/\/$/u, "") + "/.well-known/openid-configuration",
      metadata.token_endpoint,
      metadata.jwks_uri
    ])
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("discovers Keycloak and builds an authorization request with openid and S256", () =>
  Effect.gen(function*() {
    const requests: Array<string> = []
    const client = yield* Keycloak.make(options).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests.push(request.url)
          return Response.json(metadata)
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.deepStrictEqual(requests, [issuer.replace(/\/$/u, "") + "/.well-known/openid-configuration"])
    assert.strictEqual(client.oauth.metadata.issuer, issuer)
    assert.strictEqual(url.origin + url.pathname, metadata.authorization_endpoint)
    assert.strictEqual(url.searchParams.get("response_type"), "code")
    assert.strictEqual(url.searchParams.get("client_id"), options.clientId)
    assert.strictEqual(url.searchParams.get("redirect_uri"), options.redirectUri)
    assert.strictEqual(url.searchParams.get("scope"), "openid")
    assert.strictEqual(url.searchParams.get("state"), "private-state")
    assert.strictEqual(url.searchParams.get("nonce"), "private-nonce")
    assert.strictEqual(url.searchParams.get("code_challenge"), authorization.codeChallenge)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")
  }))

it.effect("requires Keycloak to advertise authorization-response issuers", () =>
  Effect.gen(function*() {
    for (const supported of [undefined, false]) {
      const error = yield* Keycloak.make(options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => Response.json({ ...metadata, authorization_response_iss_parameter_supported: supported }))
        ),
        Effect.flip
      )
      assert.strictEqual(error._tag, "OAuthConfigurationError")
    }
  }))

it.effect("rejects invalid Keycloak server URLs and realm path segments before discovery", () =>
  Effect.gen(function*() {
    for (
      const change of [
        { url: "http://keycloak.example" },
        { url: "https://user:password@keycloak.example" },
        { url: "https://keycloak.example/auth?tenant=other" },
        { url: "https://keycloak.example/auth#fragment" },
        { realm: "" },
        { realm: "realm/path" },
        { realm: ".." },
        { realm: "a".repeat(256) }
      ]
    ) {
      let requests = 0
      const error = yield* Keycloak.make({ ...options, ...change }).pipe(
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
    }
  }))

it.effect("rejects Keycloak scopes without openid before discovery", () =>
  Effect.gen(function*() {
    let requests = 0
    for (const scopes of [[], ["email"], ["openid", "openid"]] as const) {
      const error = yield* Keycloak.make({ ...options, scopes }).pipe(
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
      assert.notInclude(JSON.stringify(error), "client-secret")
    }
    assert.strictEqual(requests, 0)
  }))
