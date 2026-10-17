import type * as OAuthProvider from "@effect/auth/oauth/OAuthProvider"
import * as Vercel from "@effect/auth/oauth/providers/Vercel"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"

import { cryptoLayer, form, tokenBody, transport } from "../fixtures.ts"
import {
  claims,
  generateSigningKeys,
  metadataFor,
  oidcAuthorization,
  oidcExchange,
  providerOptions,
  seconds,
  sign,
  signingKeys
} from "./fixtures.ts"

const issuer = "https://vercel.com"

it.effect("constructs the Vercel recipe and returns a verified private profile", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* generateSigningKeys("ES256")
    const profile = { name: "Private User", email: "private@example.test", email_verified: true }
    const token = yield* sign(
      keys.privateKey,
      { ...claims, iss: issuer, ...profile, private_extension: "secret-value" },
      "ES256"
    )
    const metadata = { ...metadataFor(issuer), id_token_signing_alg_values_supported: ["ES256"] }
    const requests: Array<string> = []
    const client = yield* Vercel.make({ ...providerOptions, scopes: ["openid", "profile", "email", "offline_access"] })
      .pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests.push(request.url)
            if (request.url === issuer + "/.well-known/openid-configuration") return Response.json(metadata)
            if (request.url === metadata.token_endpoint) {
              const body = form(request)
              assert.match(request.headers.authorization, /^Basic /)
              assert.isNull(body.get("client_secret"))
              assert.strictEqual(body.get("redirect_uri"), providerOptions.redirectUri)
              assert.strictEqual(body.get("code_verifier"), Redacted.value(oidcExchange.pkceVerifier))
              return Response.json({ ...tokenBody, id_token: token })
            }
            assert.strictEqual(request.url, metadata.jwks_uri)
            return Response.json({ keys: [keys.jwk] })
          })
        )
      )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
    assert.strictEqual(url.origin + url.pathname, metadata.authorization_endpoint)
    assert.strictEqual(url.searchParams.get("scope"), "openid profile email offline_access")
    assert.strictEqual(url.searchParams.get("redirect_uri"), providerOptions.redirectUri)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")
    assert.strictEqual(url.searchParams.get("code_challenge"), oidcAuthorization.codeChallenge)
    assert.strictEqual(url.searchParams.get("nonce"), Redacted.value(oidcAuthorization.nonce))
    const result = yield* client.exchangeCode(oidcExchange)
    assert.strictEqual(result.identity.issuer, issuer)
    assert.strictEqual(result.identity.subject, claims.sub)
    assert.deepStrictEqual(Redacted.value(result.identity.profile), profile)
    assert.notInclude(JSON.stringify(result), "private@example.test")
    assert.notInclude(JSON.stringify(result), "secret-value")
    assert.deepStrictEqual(requests, [
      issuer + "/.well-known/openid-configuration",
      metadata.token_endpoint,
      metadata.jwks_uri
    ])
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("defaults to openid and rejects missing transaction protection before exchange", () =>
  Effect.gen(function*() {
    let grants = 0
    const client = yield* Vercel.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === issuer + "/.well-known/openid-configuration") return Response.json(metadataFor(issuer))
          grants++
          return Response.json(tokenBody)
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
    assert.strictEqual(url.searchParams.get("scope"), "openid")
    for (
      const operation of [
        Effect.asVoid(client.authorizationUrl({
          state: oidcAuthorization.state,
          nonce: oidcAuthorization.nonce
        } as OAuthProvider.OidcAuthorizationInput)),
        Effect.asVoid(client.exchangeCode({
          code: oidcExchange.code,
          pkceVerifier: oidcExchange.pkceVerifier
        } as OAuthProvider.OidcExchangeInput)),
        Effect.asVoid(client.exchangeCode({
          code: oidcExchange.code,
          nonce: oidcExchange.nonce
        } as OAuthProvider.OidcExchangeInput))
      ]
    ) {
      const error = yield* operation.pipe(Effect.flip)
      assert.strictEqual(error._tag, "OAuthConfigurationError")
    }
    assert.strictEqual(grants, 0)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects invalid Vercel options before discovery", () =>
  Effect.gen(function*() {
    let requests = 0
    for (
      const options of [
        { ...providerOptions, scopes: [] },
        { ...providerOptions, scopes: ["email"] },
        { ...providerOptions, scopes: ["openid", "openid"] },
        { ...providerOptions, scopes: ["openid", "repo"] },
        { ...providerOptions, redirectUri: "https://app.example/callback?unexpected=1" }
      ]
    ) {
      const error = yield* Vercel.make(options as Vercel.Options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => {
            requests++
            return Response.json(metadataFor(issuer))
          })
        ),
        Effect.flip
      )
      assert.strictEqual(error._tag, "OAuthConfigurationError")
      assert.notInclude(JSON.stringify(error), "client-secret")
    }
    assert.strictEqual(requests, 0)
  }))

it.effect("rejects invalid Vercel signed profile claims", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* signingKeys
    const invalidProfile = { email_verified: "true" }
    const token = yield* sign(keys.privateKey, { ...claims, iss: issuer, ...invalidProfile })
    const metadata = metadataFor(issuer)
    const client = yield* Vercel.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === issuer + "/.well-known/openid-configuration") return Response.json(metadata)
          if (request.url === metadata.token_endpoint) return Response.json({ ...tokenBody, id_token: token })
          return Response.json({ keys: [keys.jwk] })
        })
      )
    )
    const error = yield* client.exchangeCode(oidcExchange).pipe(Effect.flip)
    assert.strictEqual(error._tag, "OAuthRejected")
    if (error._tag === "OAuthRejected") assert.strictEqual(error.reason, "claims")
  }).pipe(Effect.provide(cryptoLayer)))
