import { createHash } from "node:crypto"

import { GitHub, Google, Microsoft, OAuth, type OAuthProvider } from "@effect/auth"
import { assert, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Scope from "effect/Scope"
import * as TestClock from "effect/testing/TestClock"
import * as jose from "jose"
import {
  codeInput,
  cryptoLayer,
  form,
  metadata,
  mockFetch,
  options,
  receipt,
  tokenBody,
  transport
} from "./fixtures.ts"

it.effect("supports form_post, comma scopes, and explicitly configured POST profiles", () =>
  Effect.gen(function*() {
    const headers = { "x-provider-version": "2026" }
    const profile = {
      url: "https://api.example/graphql",
      method: "POST" as const,
      body: "{\"query\":\"{ me { id } }\"}",
      headers
    }
    const expectedBody = profile.body
    const client = yield* OAuth.make({ ...options, scopeSeparator: ",", profile }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === metadata.token_endpoint) {
            assert.strictEqual(form(request).get("scope"), "read,write")
            return Response.json(tokenBody)
          }
          assert.strictEqual(request.url, "https://api.example/graphql")
          assert.strictEqual(request.method, "POST")
          assert.strictEqual(request.headers.authorization, "Bearer private-access")
          assert.strictEqual(request.headers["content-type"], "application/json")
          assert.strictEqual(request.headers["x-provider-version"], "2026")
          assert.strictEqual(request.body._tag, "Uint8Array")
          if (request.body._tag === "Uint8Array") {
            assert.strictEqual(new TextDecoder().decode(request.body.body), expectedBody)
          }
          return Response.json({ data: { me: { id: "provider-id" } } })
        })
      )
    )
    profile.body = "substituted"
    headers["x-provider-version"] = "substituted"
    const url = new URL(Redacted.value(
      yield* client.authorizationUrl({
        redirectUri: codeInput.redirectUri,
        scopes: ["read", "write"],
        state: Redacted.make("state"),
        responseMode: "form_post"
      })
    ))
    assert.strictEqual(url.searchParams.get("response_mode"), "form_post")
    assert.strictEqual(url.searchParams.get("scope"), "read,write")
    yield* client.refreshGrant({ refreshToken: Redacted.make("refresh"), scopes: ["read", "write"] })
    assert.deepStrictEqual(yield* client.fetchProfile(Redacted.make("private-access")), {
      data: { me: { id: "provider-id" } }
    })
  }))

it.effect("encodes JSON token requests and rejects duplicate names before dispatch", () =>
  Effect.gen(function*() {
    let calls = 0
    const client = yield* OAuth.make({ ...options, tokenBodyFormat: "json" }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          calls++
          assert.strictEqual(request.headers["content-type"], "application/json")
          assert.strictEqual(request.body._tag, "Uint8Array")
          if (request.body._tag === "Uint8Array") {
            const body = JSON.parse(new TextDecoder().decode(request.body.body))
            assert.deepStrictEqual(body, {
              grant_type: "authorization_code",
              code: "single-use-code",
              code_verifier: Redacted.value(codeInput.pkceVerifier),
              redirect_uri: codeInput.redirectUri,
              client_id: "client",
              client_secret: "client-secret",
              resource: "urn:one",
              extension: "value"
            })
          }
          return Response.json(tokenBody)
        })
      )
    )
    yield* client.codeGrant({ ...codeInput, resources: ["urn:one"], parameters: { extension: "value" } })
    for (
      const extra of [
        { resources: ["urn:one", "urn:two"] },
        { resources: ["urn:one"], parameters: { resource: "urn:other" } }
      ]
    ) {
      const failure = yield* client.codeGrant({ ...codeInput, ...extra }).pipe(Effect.flip)
      assert.strictEqual(failure._tag, "OAuthConfigurationError")
    }
    assert.strictEqual(calls, 1)
  }))

it.effect("uses request-specific post secrets for code, refresh, and revocation", () =>
  Effect.gen(function*() {
    const seen: Array<string | null> = []
    const client = yield* OAuth.make({ ...options, authentication: { method: "client_secret_post" } }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          seen.push(form(request).get("client_secret"))
          return request.url === metadata.revocation_endpoint ? new Response(null) : Response.json(tokenBody)
        })
      )
    )
    const secret = Redacted.make("request-secret")
    yield* client.codeGrant({ ...codeInput, clientSecret: secret })
    yield* client.refreshGrant({ refreshToken: Redacted.make("refresh"), clientSecret: secret })
    yield* client.revoke({ token: Redacted.make("token"), tokenTypeHint: "access_token", clientSecret: secret })
    assert.strictEqual(Redacted.value(secret), "request-secret")
    assert.deepStrictEqual(seen, ["request-secret", "request-secret", "request-secret"])
    assert.strictEqual((yield* client.codeGrant(codeInput).pipe(Effect.flip))._tag, "OAuthUnavailable")
    assert.lengthOf(seen, 3)
  }))

it.effect("keeps stored post secrets authoritative over request-specific secrets", () =>
  Effect.gen(function*() {
    const client = yield* OAuth.make(options).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          assert.strictEqual(form(request).get("client_secret"), "client-secret")
          return Response.json(tokenBody)
        })
      )
    )
    const secret = Redacted.make("request-secret")
    yield* client.codeGrant({ ...codeInput, clientSecret: secret })
    assert.strictEqual(Redacted.value(secret), "request-secret")
  }))

it.effect("preserves opaque ID-token receipts without claiming authentication", () =>
  Effect.gen(function*() {
    const raw = receipt({ ...tokenBody, id_token: "opaque-not-a-verified-jwt", scope: ["read", "write"] })
    const tokens = yield* OAuth.tokens(raw)
    assert.strictEqual(Redacted.value(tokens.idToken!), "opaque-not-a-verified-jwt")
    assert.strictEqual(tokens.scope, "read write")
    assert.deepStrictEqual(Redacted.value(raw.body).scope, ["read", "write"])
    assert.notInclude(JSON.stringify(tokens), "opaque-not-a-verified-jwt")
  }))

it.effect("captures injected HTTP and Fetch while excluding ambient cookies and tracing", () =>
  Effect.gen(function*() {
    let calls = 0
    const fetch = mockFetch(async (_request, init) => {
      calls++
      assert.strictEqual(init?.redirect, "manual")
      assert.strictEqual(init?.credentials, "omit")
      assert.strictEqual(init?.cache, "no-store")
      const headers = new Headers(init?.headers)
      for (const name of ["cookie", "traceparent", "tracestate", "baggage", "x-ambient"]) {
        assert.isNull(headers.get(name))
      }
      return Response.json(tokenBody)
    })

    const client = yield* OAuth.make(options).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(FetchHttpClient.Fetch, fetch)
    )
    const substituted = transport(() => {
      throw new Error("Captured HTTP client must be retained")
    }).pipe(HttpClient.mapRequest(HttpClientRequest.setHeader("x-ambient", "injected")))
    yield* client.codeGrant(codeInput).pipe(
      Effect.provideService(HttpClient.HttpClient, substituted),
      Effect.provideService(
        FetchHttpClient.Fetch,
        mockFetch(() => Promise.reject(new Error("Captured Fetch must be retained")))
      ),
      Effect.provideService(FetchHttpClient.RequestInit, {
        credentials: "include",
        redirect: "follow",
        headers: { cookie: "ambient-cookie", "x-ambient": "injected" }
      }),
      Effect.withSpan("caller-span")
    )
    assert.strictEqual(calls, 1)
  }))

const providerOptions = {
  clientId: "client",
  clientSecret: Redacted.make("client-secret"),
  redirectUri: codeInput.redirectUri
}

const authorization = {
  state: Redacted.make("private-state"),
  codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
} satisfies OAuthProvider.AuthorizationInput

const oidcAuthorization = {
  ...authorization,
  nonce: Redacted.make("private-nonce")
} satisfies OAuthProvider.OidcAuthorizationInput

const oidcExchange: OAuthProvider.OidcExchangeInput = {
  code: codeInput.code,
  pkceVerifier: codeInput.pkceVerifier,
  nonce: oidcAuthorization.nonce
}

const googleMetadata: OAuth.Metadata = {
  ...metadata,
  issuer: "https://accounts.google.com",
  authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  token_endpoint: "https://oauth2.googleapis.com/token",
  jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
  revocation_endpoint: "https://oauth2.googleapis.com/revoke"
}

const microsoftOrigin = "https://login.microsoftonline.com"
const microsoftTemplate = microsoftOrigin + "/{tenantid}/v2.0"
const tenantId = "11111111-1111-1111-1111-111111111111"
const objectId = "22222222-2222-2222-2222-222222222222"
const personalTenant = "9188040d-6c67-4c5b-b112-36a304b66dad"

const microsoftMetadata = (authority = "common"): OAuth.Metadata => ({
  issuer: microsoftTemplate,
  authorization_endpoint: microsoftOrigin + "/" + authority + "/oauth2/v2.0/authorize",
  token_endpoint: microsoftOrigin + "/" + authority + "/oauth2/v2.0/token",
  jwks_uri: microsoftOrigin + "/common/discovery/v2.0/keys",
  response_types_supported: ["code"],
  id_token_signing_alg_values_supported: ["RS256"],
  token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"]
})

const seconds = 2_000_000_000
const tokenHash = (value: string) => createHash("sha256").update(value).digest().subarray(0, 16).toString("base64url")
const claims = {
  sub: "pairwise-subject",
  aud: providerOptions.clientId,
  iat: seconds,
  exp: seconds + 300,
  auth_time: seconds - 10,
  nonce: "private-nonce",
  at_hash: tokenHash("private-access"),
  c_hash: tokenHash("single-use-code")
}

const signingKeys = Effect.promise(async () => {
  const keys = await jose.generateKeyPair("RS256", { extractable: true })
  return { privateKey: keys.privateKey, jwk: { ...await jose.exportJWK(keys.publicKey), kid: "provider-key" } }
})

const sign = (key: CryptoKey, payload: jose.JWTPayload) =>
  Effect.promise(() => new jose.SignJWT(payload).setProtectedHeader({ alg: "RS256", kid: "provider-key" }).sign(key))

it.effect("exchanges GitHub codes with pinned scopes and a private typed profile", () =>
  Effect.gen(function*() {
    const user = {
      id: 42,
      login: "octocat",
      name: null,
      email: "unverified@example.test",
      avatar_url: "https://avatars.githubusercontent.com/u/42",
      access_token: "unprojected-private-value"
    }
    const raw = { ...tokenBody, scope: " user:email,\tread:user ", extension: "private-extension" }
    const requests: Array<string> = []
    const client = yield* GitHub.make({ ...providerOptions, scopes: ["read:user", "user:email"] }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests.push(request.url)
          if (request.url === "https://github.com/login/oauth/access_token") {
            const body = form(request)
            assert.strictEqual(body.get("code"), "single-use-code")
            assert.strictEqual(body.get("code_verifier"), Redacted.value(codeInput.pkceVerifier))
            assert.strictEqual(body.get("redirect_uri"), providerOptions.redirectUri)
            assert.strictEqual(body.get("client_id"), providerOptions.clientId)
            assert.strictEqual(body.get("client_secret"), "client-secret")
            return Response.json(raw)
          }
          assert.strictEqual(request.url, "https://api.github.com/user")
          assert.strictEqual(request.headers.authorization, "Bearer private-access")
          assert.strictEqual(request.headers.accept, "application/vnd.github+json")
          assert.isString(request.headers["user-agent"])
          assert.isString(request.headers["x-github-api-version"])
          return Response.json(user)
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.strictEqual(url.origin + url.pathname, "https://github.com/login/oauth/authorize")
    assert.strictEqual(url.searchParams.get("scope"), "read:user user:email")
    assert.strictEqual(url.searchParams.get("redirect_uri"), providerOptions.redirectUri)
    assert.strictEqual(url.searchParams.get("state"), "private-state")
    assert.strictEqual(url.searchParams.get("code_challenge"), authorization.codeChallenge)
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")
    const result = yield* client.exchangeCode(codeInput)
    assert.strictEqual(result.identity.issuer, "https://github.com/login/oauth")
    assert.strictEqual(result.identity.subject, "42")
    assert.deepStrictEqual(Redacted.value(result.identity.profile), {
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url
    })
    assert.deepStrictEqual(Redacted.value(result.receipt.body), raw)
    assert.strictEqual(Redacted.value(result.tokens.accessToken), "private-access")
    assert.strictEqual(result.tokens.expiresIn, 60)
    assert.sameMembers(result.tokens.scope!.split(" "), ["read:user", "user:email"])
    for (const privateValue of [user.email, "private-access", "private-extension"]) {
      assert.notInclude(JSON.stringify(result), privateValue)
    }
    assert.deepStrictEqual(requests, ["https://github.com/login/oauth/access_token", "https://api.github.com/user"])
  }))

it.effect("checks GitHub receipts before normalization or profile requests", () =>
  Effect.gen(function*() {
    const success = { access_token: "private-access", token_type: "bearer", scope: "read:user" }
    const cases = [
      { status: 200, body: { error: "bad_verification_code" }, rejected: true },
      { status: 400, body: { error: "bad_verification_code" }, rejected: true },
      { status: 500, body: { error: "bad_verification_code" } },
      { status: 200, body: { ...success, error: "bad_verification_code" } },
      { status: 200, body: { ...success, expires_in: "60" } },
      { status: 200, body: { ...success, expires_in: 0 } },
      { status: 200, body: { ...success, scope: "read:user, repo" } },
      { status: 200, body: { ...success, scope: "read:user,read:user" } },
      { status: 200, body: { ...success, id_token: "private-unexpected-token" } }
    ]
    let current = cases[0]
    let exchanges = 0
    let profiles = 0
    const client = yield* GitHub.make(providerOptions).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === "https://github.com/login/oauth/access_token") {
            exchanges++
            return Response.json(current.body, { status: current.status })
          }
          profiles++
          return Response.json({ id: 42 })
        })
      )
    )
    for (const entry of cases) {
      current = entry
      const error = yield* client.exchangeCode(codeInput).pipe(Effect.flip)
      assert.strictEqual(error._tag, entry.rejected === true ? "OAuthRejected" : "OAuthUnavailable")
      if (error._tag === "OAuthRejected") assert.strictEqual(error.reason, "invalid_grant")
      assert.notInclude(JSON.stringify(error), "private-")
    }
    assert.strictEqual(exchanges, cases.length)
    assert.strictEqual(profiles, 0)
  }))

it.effect("requires an expiring GitHub receipt when requesting offline access", () =>
  Effect.gen(function*() {
    const success = { ...tokenBody, scope: "read:user" }
    let current: Record<string, unknown> = success
    let profiles = 0
    const client = yield* GitHub.make({ ...providerOptions, scopes: ["read:user", "offline_access"] }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          if (request.url === "https://github.com/login/oauth/access_token") return Response.json(current)
          profiles++
          return Response.json({ id: 42 })
        })
      )
    )
    const url = new URL(Redacted.value(yield* client.authorizationUrl(authorization)))
    assert.strictEqual(url.searchParams.get("scope"), "read:user offline_access")
    const result = yield* client.exchangeCode(codeInput)
    assert.strictEqual(result.tokens.scope, "read:user")
    assert.strictEqual(Redacted.value(result.tokens.refreshToken!), "private-refresh")
    for (
      const invalid of [
        { ...success, refresh_token: undefined },
        { ...success, expires_in: undefined },
        { ...success, refresh_token_expires_in: undefined },
        { ...success, refresh_token_expires_in: "600" },
        { ...success, refresh_token_expires_in: 0 },
        { ...success, scope: "read:user,offline_access" }
      ]
    ) {
      current = invalid
      assert.strictEqual((yield* client.exchangeCode(codeInput).pipe(Effect.flip))._tag, "OAuthUnavailable")
    }
    assert.strictEqual(profiles, 1)
  }))

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

it.effect("uses Microsoft oid and tid consistently across tenant authorities", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* signingKeys
    for (const tenant of [undefined, "organizations", "consumers", tenantId] as const) {
      const tid = tenant === "consumers" ? personalTenant : tenantId
      const issuer = microsoftOrigin + "/" + tid + "/v2.0"
      const profile = { oid: objectId, tid, email: "mutable@example.test", preferred_username: "mutable-name" }
      const idToken = yield* sign(keys.privateKey, { ...claims, iss: issuer, ...profile })
      const authenticationMethod = tenant === tenantId ? "client_secret_post" : "client_secret_basic"
      const requests: Array<string> = []
      const client = yield* Microsoft.make({
        ...providerOptions,
        ...(tenant === undefined ? {} : { tenant }),
        ...(authenticationMethod === "client_secret_post" ? { authenticationMethod } : {})
      }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests.push(request.url)
            if (request.url.endsWith("/.well-known/openid-configuration")) {
              const authority = new URL(request.url).pathname.split("/")[1]
              assert.include(tenant === "consumers" ? ["consumers", personalTenant] : [tenant ?? "common"], authority)
              return Response.json(microsoftMetadata(authority))
            }
            if (request.url.endsWith("/oauth2/v2.0/token")) {
              const body = form(request)
              if (authenticationMethod === "client_secret_post") {
                assert.strictEqual(body.get("client_secret"), "client-secret")
              } else {
                assert.match(request.headers.authorization, /^Basic /)
                assert.isNull(body.get("client_secret"))
              }
              assert.strictEqual(body.get("code_verifier"), Redacted.value(codeInput.pkceVerifier))
              return Response.json({ ...tokenBody, id_token: idToken })
            }
            assert.strictEqual(request.url, microsoftMetadata().jwks_uri)
            return Response.json({ keys: [{ ...keys.jwk, issuer: microsoftTemplate }] })
          })
        )
      )
      const url = new URL(Redacted.value(yield* client.authorizationUrl(oidcAuthorization)))
      assert.strictEqual(url.searchParams.get("scope"), "openid profile")
      assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")
      const result = yield* client.exchangeCode(oidcExchange)
      assert.strictEqual(result.identity.issuer, issuer)
      assert.strictEqual(result.identity.subject, objectId + ":" + tid)
      assert.deepStrictEqual(Redacted.value(result.identity.profile), profile)
      assert.lengthOf(requests, 3)
    }
  }).pipe(Effect.provide(cryptoLayer)))

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

it.effect("enforces Microsoft tenant and signing-key authority beyond generic OIDC checks", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* signingKeys
    const issuer = microsoftOrigin + "/" + tenantId + "/v2.0"
    const concrete = {
      tenant: tenantId,
      metadataIssuer: issuer,
      issuer,
      tid: tenantId,
      oid: objectId,
      keyIssuer: issuer
    }
    for (
      const entry of [
        { ...concrete, tid: personalTenant },
        {
          ...concrete,
          tenant: "organizations",
          metadataIssuer: microsoftTemplate,
          issuer: microsoftOrigin + "/" + personalTenant + "/v2.0",
          tid: personalTenant,
          keyIssuer: microsoftTemplate
        },
        { ...concrete, keyIssuer: undefined },
        { ...concrete, oid: "not-an-object-guid" }
      ]
    ) {
      const token = yield* sign(keys.privateKey, { ...claims, iss: entry.issuer, tid: entry.tid, oid: entry.oid })
      let requests = 0
      const client = yield* Microsoft.make({ ...providerOptions, tenant: entry.tenant }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests++
            if (request.url.endsWith("/.well-known/openid-configuration")) {
              return Response.json({ ...microsoftMetadata(entry.tenant), issuer: entry.metadataIssuer })
            }
            if (request.url.endsWith("/oauth2/v2.0/token")) return Response.json({ ...tokenBody, id_token: token })
            assert.strictEqual(request.url, microsoftMetadata().jwks_uri)
            return Response.json({
              keys: [{ ...keys.jwk, ...(entry.keyIssuer === undefined ? {} : { issuer: entry.keyIssuer }) }]
            })
          })
        )
      )
      const error = yield* client.exchangeCode(oidcExchange).pipe(Effect.flip)
      assert.strictEqual(error._tag, "OAuthRejected")
      if (error._tag === "OAuthRejected") assert.strictEqual(error.reason, "claims")
      assert.strictEqual(requests, 3)
    }
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
