import type { OAuthProvider } from "@effect/auth/oauth"
import { GitHub, Google, Microsoft } from "@effect/auth/oauth/providers"
import { assert, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Scope from "effect/Scope"
import * as TestClock from "effect/testing/TestClock"
import { codeInput, tokenBody } from "../fixtures.ts"
import {
  authorization,
  claims,
  cryptoLayer,
  form,
  googleMetadata,
  microsoftMetadata,
  microsoftOrigin,
  microsoftTemplate,
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

it.effect("requires PKCE and OIDC nonce before dispatching a code", () =>
  Effect.gen(function*() {
    let grants = 0
    const http = transport((request) => {
      if (request.url === googleMetadata.issuer + "/.well-known/openid-configuration") {
        return Response.json(googleMetadata)
      }
      grants++
      return Response.json(tokenBody)
    })
    const github = yield* GitHub.make(providerOptions).pipe(Effect.provideService(HttpClient.HttpClient, http))
    const google = yield* Google.make(providerOptions).pipe(Effect.provideService(HttpClient.HttpClient, http))
    const erased = Redacted.make(Redacted.value(codeInput.pkceVerifier))
    Redacted.wipeUnsafe(erased)
    const operations = [
      Effect.asVoid(github.authorizationUrl({ state: authorization.state } as GitHub.AuthorizationInput)),
      Effect.asVoid(github.exchangeCode({ code: codeInput.code } as OAuthProvider.ExchangeInput)),
      Effect.asVoid(github.exchangeCode({ ...codeInput, pkceVerifier: erased })),
      Effect.asVoid(google.authorizationUrl(authorization as Google.AuthorizationInput)),
      Effect.asVoid(google.authorizationUrl({ ...oidcAuthorization, nonce: erased })),
      Effect.asVoid(google.exchangeCode(codeInput as unknown as OAuthProvider.OidcExchangeInput)),
      Effect.asVoid(google.exchangeCode({ ...oidcExchange, nonce: erased }))
    ]
    for (const operation of operations) {
      const error = yield* operation.pipe(Effect.flip)
      assert.include(["OAuthConfigurationError", "OAuthUnavailable"], error._tag)
    }
    const unsupportedPrompt = yield* google.authorizationUrl({
      ...oidcAuthorization,
      prompt: "login"
    } as unknown as Google.AuthorizationInput).pipe(Effect.flip)
    assert.strictEqual(unsupportedPrompt._tag, "OAuthConfigurationError")
    assert.strictEqual(grants, 0)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects discovery outside the preset issuer and PKCE policy", () =>
  Effect.gen(function*() {
    const google = yield* Google.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport(() => Response.json({ ...googleMetadata, issuer: googleMetadata.issuer + "/" }))
      ),
      Effect.flip
    )
    assert.strictEqual(google._tag, "OAuthConfigurationError")
    for (
      const change of [
        { code_challenge_methods_supported: ["plain"] },
        { token_endpoint: "https://other.example/common/oauth2/v2.0/token" },
        { token_endpoint: microsoftOrigin + "/common/unexpected-token" }
      ]
    ) {
      let calls = 0
      const error = yield* Microsoft.make(providerOptions).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => {
            calls++
            return Response.json({ ...microsoftMetadata(), ...change })
          })
        ),
        Effect.flip
      )
      assert.strictEqual(error._tag, "OAuthConfigurationError")
      assert.strictEqual(calls, 1)
    }
  }))

it.effect("captures provider configuration and transaction secrets before network effects", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* signingKeys
    const token = yield* sign(keys.privateKey, { ...claims, iss: googleMetadata.issuer })
    const originalSecret = Redacted.make("client-secret")
    const originalCode = Redacted.make(Redacted.value(codeInput.code))
    const originalVerifier = Redacted.make(Redacted.value(codeInput.pkceVerifier))
    const originalNonce = Redacted.make("private-nonce")
    const scopes: Array<"openid" | "profile" | "email"> = ["openid", "email"]
    const configuration = { ...providerOptions, clientSecret: originalSecret, scopes, hostedDomain: "hint.example" }
    let grants = 0
    const client = yield* Google.make(configuration).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === googleMetadata.issuer + "/.well-known/openid-configuration") {
            Redacted.wipeUnsafe(originalSecret)
            configuration.clientId = "changed-client"
            configuration.clientSecret = Redacted.make("changed-secret")
            configuration.redirectUri = "https://changed.example/callback"
            configuration.hostedDomain = "changed.example"
            scopes.splice(0, scopes.length, "openid")
            return Response.json(googleMetadata)
          }
          if (request.url === googleMetadata.jwks_uri) return Response.json({ keys: [keys.jwk] })
          grants++
          const body = form(request)
          assert.strictEqual(body.get("redirect_uri"), providerOptions.redirectUri)
          assert.strictEqual(body.get("client_id"), providerOptions.clientId)
          assert.strictEqual(body.get("client_secret"), "client-secret")
          Redacted.wipeUnsafe(originalCode)
          Redacted.wipeUnsafe(originalVerifier)
          Redacted.wipeUnsafe(originalNonce)
          return Response.json({ ...tokenBody, id_token: token })
        })
      )
    )
    const request = {
      ...oidcAuthorization,
      nonce: originalNonce,
      redirectUri: "https://injected.example/callback",
      scopes: ["profile"]
    }
    const url = new URL(Redacted.value(yield* client.authorizationUrl(request)))
    assert.strictEqual(url.searchParams.get("client_id"), providerOptions.clientId)
    assert.strictEqual(url.searchParams.get("redirect_uri"), providerOptions.redirectUri)
    assert.strictEqual(url.searchParams.get("scope"), "openid email")
    assert.strictEqual(url.searchParams.get("hd"), "hint.example")
    const exchange = {
      code: originalCode,
      pkceVerifier: originalVerifier,
      nonce: originalNonce,
      redirectUri: request.redirectUri
    }
    const result = yield* client.exchangeCode(exchange)
    assert.strictEqual(result.identity.subject, claims.sub)
    assert.strictEqual(grants, 1)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("joins an interrupted provider exchange before closing its owner and never fetches the profile", () =>
  Effect.gen(function*() {
    const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
    const entered = yield* Deferred.make<void>()
    const cleaning = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    let cleaned = false
    let closed = false
    const requests: Array<string> = []
    const http = transport((request) => {
      requests.push(request.url)
      return Response.json(
        request.url === "https://github.com/login/oauth/access_token"
          ? { ...tokenBody, scope: "read:user" }
          : { id: 42 }
      )
    }).pipe(HttpClient.transform((effect, request) =>
      request.url !== "https://github.com/login/oauth/access_token"
        ? effect
        : effect.pipe(
          Effect.tap(() => Deferred.succeed(entered, undefined)),
          Effect.andThen(Effect.never),
          Effect.ensuring(Effect.gen(function*() {
            yield* Deferred.succeed(cleaning, undefined)
            yield* Deferred.await(release)
            cleaned = true
          }))
        )
    ))
    const client = yield* GitHub.make(providerOptions).pipe(
      Effect.provideService(HttpClient.HttpClient, http),
      Effect.provideService(Scope.Scope, scope)
    )
    const exchange = yield* client.exchangeCode(codeInput).pipe(Effect.forkChild)
    yield* Deferred.await(entered)
    const closing = yield* Scope.close(scope, Exit.void).pipe(
      Effect.tap(() =>
        Effect.sync(() => {
          closed = true
        })
      ),
      Effect.forkChild
    )
    yield* Deferred.await(cleaning)
    assert.isFalse(closed)
    yield* Deferred.succeed(release, undefined)
    yield* Fiber.join(closing)
    assert.isTrue(cleaned)
    assert.strictEqual((yield* Fiber.join(exchange).pipe(Effect.flip))._tag, "OAuthUnavailable")
    assert.deepStrictEqual(requests, ["https://github.com/login/oauth/access_token"])
  }))

it.effect("provides independent provider services whose clients close with their layers", () =>
  Effect.gen(function*() {
    let grants = 0
    const http = transport((request) => {
      if (request.url === googleMetadata.issuer + "/.well-known/openid-configuration") {
        return Response.json(googleMetadata)
      }
      if (request.url.endsWith("/.well-known/openid-configuration")) return Response.json(microsoftMetadata())
      grants++
      return Response.json(tokenBody)
    })
    const clients = yield* Effect.gen(function*() {
      const github = yield* GitHub.Client
      const google = yield* Google.Client
      const microsoft = yield* Microsoft.Client
      assert.strictEqual(github.oauth.metadata.issuer, "https://github.com/login/oauth")
      assert.strictEqual(google.oauth.metadata.issuer, googleMetadata.issuer)
      assert.strictEqual(microsoft.oauth.metadata.issuer, microsoftTemplate)
      return { github, google, microsoft }
    }).pipe(
      Effect.provide(Layer.mergeAll(
        GitHub.layer(providerOptions),
        Google.layer(providerOptions),
        Microsoft.layer(providerOptions)
      )),
      Effect.provideService(HttpClient.HttpClient, http)
    )
    for (
      const operation of [
        Effect.asVoid(clients.github.exchangeCode(codeInput)),
        Effect.asVoid(clients.google.exchangeCode(oidcExchange)),
        Effect.asVoid(clients.microsoft.exchangeCode(oidcExchange))
      ]
    ) {
      assert.strictEqual((yield* operation.pipe(Effect.flip))._tag, "OAuthUnavailable")
    }
    assert.strictEqual(grants, 0)
  }).pipe(Effect.provide(cryptoLayer)))
