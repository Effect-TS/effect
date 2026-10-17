import { OAuth } from "@effect/auth/oauth"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Redacted from "effect/Redacted"
import { codeInput, form, metadata, mockFetch, options, receipt, tokenBody, transport } from "./fixtures.ts"

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
