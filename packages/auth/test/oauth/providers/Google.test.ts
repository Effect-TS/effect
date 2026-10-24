import { Google } from "@effect/auth/oauth/providers"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"
import { codeInput, tokenBody } from "../fixtures.ts"
import {
  claims,
  cryptoLayer,
  form,
  googleMetadata,
  oidcAuthorization,
  oidcExchange,
  seconds,
  sign,
  signingKeys,
  transport
} from "./fixtures.ts"

const providerOptions = {
  clientId: "client",
  clientSecret: Redacted.make("client-secret"),
  redirectUri: codeInput.redirectUri
}

it.effect("verifies Google ID tokens and treats hostedDomain as an authorization hint", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* signingKeys
    const profile = {
      name: "Ada",
      email: "ada@actual.example",
      email_verified: true,
      hd: "actual.example"
    }
    const idToken = yield* sign(keys.privateKey, { ...claims, iss: googleMetadata.issuer, ...profile })
    const requests: Array<string> = []
    const client = yield* Google.make({ ...providerOptions, hostedDomain: "hint.example" }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests.push(request.url)
          if (request.url === googleMetadata.issuer + "/.well-known/openid-configuration") {
            return Response.json(googleMetadata)
          }
          if (request.url === googleMetadata.token_endpoint) {
            const body = form(request)
            assert.strictEqual(body.get("client_secret"), "client-secret")
            assert.strictEqual(body.get("redirect_uri"), providerOptions.redirectUri)
            assert.strictEqual(body.get("code_verifier"), Redacted.value(codeInput.pkceVerifier))
            return Response.json({ ...tokenBody, id_token: idToken })
          }
          assert.strictEqual(request.url, googleMetadata.jwks_uri)
          return Response.json({ keys: [keys.jwk] })
        })
      )
    )
    const unrestricted = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
    assert.isNull(unrestricted.searchParams.get("max_age"))
    assert.isNull(unrestricted.searchParams.get("claims"))
    const url = new URL(Redacted.value(
      yield* client.authorizationUrl({ ...oidcAuthorization, maxAge: "60 seconds" })
    ))
    assert.strictEqual(url.searchParams.get("scope"), "openid profile email")
    assert.strictEqual(url.searchParams.get("prompt"), "select_account")
    assert.strictEqual(url.searchParams.get("access_type"), "offline")
    assert.strictEqual(url.searchParams.get("hd"), "hint.example")
    assert.strictEqual(url.searchParams.get("nonce"), "private-nonce")
    assert.strictEqual(url.searchParams.get("max_age"), "60")
    assert.deepStrictEqual(JSON.parse(url.searchParams.get("claims")!), {
      id_token: { auth_time: { essential: true } }
    })
    const result = yield* client.exchangeCode({ ...oidcExchange, maxAge: "60 seconds" })
    assert.strictEqual(result.identity.issuer, googleMetadata.issuer)
    assert.strictEqual(result.identity.subject, claims.sub)
    assert.deepStrictEqual(Redacted.value(result.identity.profile), profile)
    assert.strictEqual(Redacted.value(result.tokens.idToken!), idToken)
    assert.notInclude(JSON.stringify(result), profile.email)
    assert.notInclude(JSON.stringify(result), idToken)
    assert.deepStrictEqual(requests, [
      googleMetadata.issuer + "/.well-known/openid-configuration",
      googleMetadata.token_endpoint,
      googleMetadata.jwks_uri
    ])
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("requires verified Google claims and valid profile fields before returning identity", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* signingKeys
    const wrongKeys = yield* signingKeys
    const cases = [
      {
        token: yield* sign(wrongKeys.privateKey, { ...claims, iss: googleMetadata.issuer }),
        tag: "OAuthUnavailable"
      },
      {
        token: yield* sign(keys.privateKey, { ...claims, iss: googleMetadata.issuer, nonce: "wrong-nonce" }),
        tag: "OAuthRejected"
      },
      {
        token: yield* sign(keys.privateKey, { ...claims, iss: googleMetadata.issuer, email_verified: "true" }),
        tag: "OAuthRejected"
      },
      {
        token: yield* sign(keys.privateKey, { ...claims, iss: googleMetadata.issuer, auth_time: undefined }),
        maxAge: "60 seconds" as const,
        tag: "OAuthRejected"
      },
      { token: undefined, tag: "OAuthUnavailable" }
    ]
    let current = cases[0]
    let grants = 0
    const google = yield* Google.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === googleMetadata.issuer + "/.well-known/openid-configuration") {
            return Response.json(googleMetadata)
          }
          if (request.url === googleMetadata.token_endpoint) {
            grants++
            return Response.json({ ...tokenBody, ...(current.token === undefined ? {} : { id_token: current.token }) })
          }
          assert.strictEqual(request.url, googleMetadata.jwks_uri)
          return Response.json({ keys: [keys.jwk] })
        })
      )
    )
    for (const entry of cases) {
      current = entry
      const error = yield* google.exchangeCode({
        ...oidcExchange,
        ...(entry.maxAge === undefined ? {} : { maxAge: entry.maxAge })
      }).pipe(Effect.flip)
      assert.strictEqual(error._tag, entry.tag)
      assert.notInclude(JSON.stringify(error), "private-")
    }
    assert.strictEqual(grants, cases.length)
  }).pipe(Effect.provide(cryptoLayer)))
