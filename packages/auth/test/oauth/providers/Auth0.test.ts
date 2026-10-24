import * as Auth0 from "@effect/auth/oauth/providers/Auth0"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"

import { codeInput, metadata as baseMetadata, tokenBody, transport } from "../fixtures.ts"
import { claims, cryptoLayer, form, generateSigningKeys, oidcExchange, seconds, sign } from "./fixtures.ts"

const issuer = "https://tenant.auth0.com/"
const metadata = {
  ...baseMetadata,
  issuer,
  authorization_endpoint: issuer + "authorize",
  token_endpoint: issuer + "oauth/token",
  jwks_uri: issuer + ".well-known/jwks.json",
  authorization_response_iss_parameter_supported: true
}
const options: Auth0.Options = {
  clientId: "client",
  clientSecret: Redacted.make("client-secret"),
  redirectUri: codeInput.redirectUri,
  domain: "tenant.auth0.com"
}
const authorization = {
  state: Redacted.make("private-state"),
  nonce: Redacted.make("private-nonce"),
  codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
}

it.effect("exchanges a signed Auth0 ID token and projects only private profile claims", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generateSigningKeys("RS256")
    const idToken = yield* sign(keys.privateKey, {
      ...claims,
      iss: issuer,
      name: "Ada",
      email: "ada@example.test",
      email_verified: true,
      private_extension: "discard-this"
    }, "RS256")
    const requests: Array<string> = []
    const secret = Redacted.make("client-secret")
    const scopes: Array<"openid" | "profile" | "email"> = ["openid", "email"]
    const registration = { ...options, clientSecret: secret, scopes }
    const client = yield* Auth0.make(registration).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests.push(request.url)
          if (request.url.endsWith("/.well-known/openid-configuration")) {
            Redacted.wipeUnsafe(secret)
            registration.clientId = "substituted-client"
            registration.redirectUri = "https://other.example/callback"
            scopes.splice(0, scopes.length, "openid")
            return Response.json({ ...metadata, id_token_signing_alg_values_supported: ["RS256"] })
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

it.effect("discovers Auth0 and builds an authorization request with openid and S256", () =>
  Effect.gen(function*() {
    const requests: Array<string> = []
    const client = yield* Auth0.make(options).pipe(
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

it.effect("preserves the Auth0 issuer trailing slash and rejects domain URL inputs", () =>
  Effect.gen(function*() {
    for (const domain of ["https://tenant.auth0.com", "tenant.auth0.com/path", "tenant.auth0.com:443", "localhost"]) {
      let requests = 0
      const error = yield* Auth0.make({ ...options, domain }).pipe(
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
    const error = yield* Auth0.make(options).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport(() => Response.json({ ...metadata, issuer: issuer.slice(0, -1) }))
      ),
      Effect.flip
    )
    assert.strictEqual(error._tag, "OAuthConfigurationError")
  }))

it.effect("rejects Auth0 scopes without openid before discovery", () =>
  Effect.gen(function*() {
    let requests = 0
    for (const scopes of [[], ["email"], ["openid", "openid"]] as const) {
      const error = yield* Auth0.make({ ...options, scopes }).pipe(
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
