import * as Zitadel from "@effect/auth/oauth/providers/Zitadel"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"

import { codeInput, metadata as baseMetadata, tokenBody, transport } from "../fixtures.ts"
import { claims, cryptoLayer, form, generateSigningKeys, oidcExchange, seconds, sign } from "./fixtures.ts"

const issuer = "https://instance.zitadel.cloud"
const metadata = {
  ...baseMetadata,
  issuer,
  authorization_endpoint: issuer + "/oauth/v2/authorize",
  token_endpoint: issuer + "/oauth/v2/token",
  jwks_uri: issuer + "/oauth/v2/keys"
}
const options: Zitadel.Options = {
  clientId: "client",
  clientSecret: Redacted.make("client-secret"),
  redirectUri: codeInput.redirectUri,
  domain: "instance.zitadel.cloud"
}
const authorization = {
  state: Redacted.make("private-state"),
  nonce: Redacted.make("private-nonce"),
  codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
}

it.effect("exchanges a signed Zitadel ID token and projects only private profile claims", () =>
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
    const client = yield* Zitadel.make({ ...options, scopes: ["openid", "email"] }).pipe(
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

it.effect("discovers Zitadel and builds an authorization request with openid and S256", () =>
  Effect.gen(function*() {
    const requests: Array<string> = []
    const client = yield* Zitadel.make(options).pipe(
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

it.effect("rejects Zitadel URL domains and mismatched discovery issuers", () =>
  Effect.gen(function*() {
    for (const domain of ["https://instance.zitadel.cloud", "instance.zitadel.cloud/path", "localhost"]) {
      let requests = 0
      const error = yield* Zitadel.make({ ...options, domain }).pipe(
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
    const error = yield* Zitadel.make(options).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport(() => Response.json({ ...metadata, issuer: "https://other.zitadel.cloud" }))
      ),
      Effect.flip
    )
    assert.strictEqual(error._tag, "OAuthConfigurationError")
  }))

it.effect("rejects Zitadel scopes without openid before discovery", () =>
  Effect.gen(function*() {
    let requests = 0
    for (const scopes of [[], ["email"], ["openid", "openid"]] as const) {
      const error = yield* Zitadel.make({ ...options, scopes }).pipe(
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
