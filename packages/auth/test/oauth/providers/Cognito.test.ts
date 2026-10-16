import * as Cognito from "@effect/auth/oauth/providers/Cognito"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"

import { codeInput, metadata as baseMetadata, tokenBody, transport } from "../fixtures.ts"
import { claims, cryptoLayer, form, generateSigningKeys, oidcExchange, seconds, sign } from "./fixtures.ts"

const issuer = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Pool123"
const metadata = {
  ...baseMetadata,
  issuer,
  authorization_endpoint: "https://tenant.auth.us-east-1.amazoncognito.com/oauth2/authorize",
  token_endpoint: "https://tenant.auth.us-east-1.amazoncognito.com/oauth2/token",
  jwks_uri: issuer + "/.well-known/jwks.json",
  code_challenge_methods_supported: undefined
}
const options: Cognito.Options = {
  clientId: "client",
  clientSecret: Redacted.make("client-secret"),
  redirectUri: codeInput.redirectUri,
  region: "us-east-1",
  userPoolId: "us-east-1_Pool123"
}
const authorization = {
  state: Redacted.make("private-state"),
  nonce: Redacted.make("private-nonce"),
  codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
}

it.effect("exchanges a signed Cognito ID token and projects only private profile claims", () =>
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
    const client = yield* Cognito.make({ ...options, scopes: ["openid", "email"] }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests.push(request.url)
          if (request.url.endsWith("/.well-known/openid-configuration")) {
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

it.effect("discovers Cognito and builds an authorization request with openid and S256", () =>
  Effect.gen(function*() {
    const requests: Array<string> = []
    const client = yield* Cognito.make(options).pipe(
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

it.effect("rejects mismatched Cognito regions before discovery", () =>
  Effect.gen(function*() {
    let requests = 0
    const error = yield* Cognito.make({ ...options, region: "us-west-2" }).pipe(
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

it.effect("pins Cognito issuer and JWKS before supplementing missing S256", () =>
  Effect.gen(function*() {
    for (
      const change of [
        { issuer: "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_Other" },
        { jwks_uri: "https://substituted.example/jwks" },
        { jwks_uri: issuer + "/.well-known/jwks.json?changed=true" },
        { jwks_uri: undefined },
        { code_challenge_methods_supported: ["plain"] },
        { code_challenge_methods_supported: [] }
      ]
    ) {
      let requests = 0
      const error = yield* Cognito.make(options).pipe(
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

it.effect("rejects Cognito scopes without openid before discovery", () =>
  Effect.gen(function*() {
    let requests = 0
    for (const scopes of [[], ["email"], ["openid", "openid"]] as const) {
      const error = yield* Cognito.make({ ...options, scopes }).pipe(
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
