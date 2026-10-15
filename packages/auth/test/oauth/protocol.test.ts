// Public contracts adapted from panva/oauth4webapi v3.8.8 test/{client_auth,
// authorization_code,refresh_token,revocation,discovery}.test.ts and panva/openid-client
// v6.8.8 test/token-response.test.ts. Exact commits, selected case mappings and
// MIT notices in ../../THIRD_PARTY_NOTICES.md.
// Cancellation seam adapted from the existing Auth adapter protocol.test.ts.
import { assert, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as Scope from "effect/Scope"
import * as TestClock from "effect/testing/TestClock"

import { OAuth, Oidc, Pkce } from "@effect/auth"
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

it.effect("uses RFC7636 S256 and fresh private 32-byte transaction secrets", () =>
  Effect.gen(function*() {
    assert.strictEqual(yield* Pkce.challenge(codeInput.pkceVerifier), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
    const first = yield* Pkce.make()
    const second = yield* Pkce.random()

    assert.match(Redacted.value(first.verifier), /^[\w-]{43}$/)
    assert.strictEqual(first.challenge, yield* Pkce.challenge(first.verifier))
    assert.notStrictEqual(Redacted.value(first.verifier), Redacted.value(second))
    assert.notInclude(JSON.stringify(first), Redacted.value(first.verifier))
    assert.strictEqual((yield* Pkce.challenge(Redacted.make("short")).pipe(Effect.flip))._tag, "OAuthUnavailable")
  }).pipe(Effect.provide(cryptoLayer)))

it.effect(
  "discovers the exact issuer including its trailing slash and rejects substituted metadata",
  () =>
    Effect.gen(function*() {
      const requests: Array<string> = []
      let document = metadata

      const client = transport((request) => {
        requests.push(request.url)

        return Response.json(document)
      })

      assert.deepStrictEqual(
        yield* Oidc.discover(metadata.issuer, { timeoutMs: 1000 }).pipe(
          Effect.provideService(HttpClient.HttpClient, client)
        ),
        metadata
      )
      assert.deepStrictEqual(requests, ["https://issuer.example/tenant/.well-known/openid-configuration"])
      document = { ...metadata, issuer: metadata.issuer.slice(0, -1) }
      assert.strictEqual(
        (yield* Oidc.discover(metadata.issuer, { timeoutMs: 1000 }).pipe(
          Effect.provideService(HttpClient.HttpClient, client),
          Effect.flip
        ))._tag,
        "OAuthConfigurationError"
      )
      assert.strictEqual(
        (yield* Oidc.discover("http://issuer.example", { timeoutMs: 1000 }).pipe(
          Effect.provideService(HttpClient.HttpClient, client),
          Effect.flip
        ))._tag,
        "OAuthConfigurationError"
      )
      assert.lengthOf(requests, 2)
    })
)

it.effect("authenticates Basic/Post/None once and preserves private raw provider receipts", () =>
  Effect.gen(function*() {
    for (const method of ["client_secret_basic", "client_secret_post", "none"] as const) {
      let count = 0
      const clientId = "client %&+-_.!~*'()"

      const client = yield* OAuth.make({
        ...options,
        clientId,
        authentication: method === "none"
          ? { method, publicClient: true }
          : { method, secret: Redacted.make(clientId) }
      }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            count++
            assert.strictEqual(request.url, metadata.token_endpoint)
            assert.strictEqual(request.method, "POST")
            assert.isUndefined(request.headers.traceparent)
            const body = form(request)

            assert.strictEqual(body.get("grant_type"), "authorization_code")
            assert.strictEqual(body.get("code"), "single-use-code")
            assert.strictEqual(body.get("code_verifier"), Redacted.value(codeInput.pkceVerifier))
            assert.strictEqual(body.get("redirect_uri"), codeInput.redirectUri)
            assert.deepStrictEqual(body.getAll("resource"), ["https://api.example/one", "urn:api:two"])
            assert.strictEqual(body.get("extension"), "value")
            if (method === "client_secret_basic") {
              assert.strictEqual(
                atob(request.headers.authorization.slice(6)),
                "client+%25%26%2B%2D%5F%2E%21%7E%2A%27%28%29:client+%25%26%2B%2D%5F%2E%21%7E%2A%27%28%29"
              )
              assert.strictEqual(body.has("client_id"), false)
              assert.strictEqual(body.has("client_secret"), false)
            } else {
              assert.isUndefined(request.headers.authorization)
              assert.strictEqual(body.get("client_id"), clientId)
              assert.strictEqual(body.get("client_secret"), method === "none" ? null : clientId)
            }

            return Response.json(tokenBody)
          })
        )
      )

      const raw = yield* client.codeGrant({
        ...codeInput,
        resources: ["https://api.example/one", "urn:api:two"],
        parameters: { extension: "value" }
      })

      assert.deepStrictEqual(Redacted.value(raw.body), tokenBody)
      const grant = yield* OAuth.tokens(raw)

      assert.strictEqual(Redacted.value(grant.accessToken), "private-access")
      assert.strictEqual(grant.scope, "read:user, repo")
      assert.strictEqual(grant.expiresIn, 60)
      assert.notInclude(JSON.stringify([raw, grant]), "private-access")
      assert.strictEqual(count, 1)
    }
  }))

it.effect("distinguishes complete invalid_grant400 from ambiguous or malformed receipts", () =>
  Effect.gen(function*() {
    assert.strictEqual(
      (yield* OAuth.tokens(
        receipt({ error: "invalid_grant", error_description: "private-provider-data" }, 400)
      ).pipe(Effect.flip))._tag,
      "OAuthRejected"
    )
    for (
      const raw of [
        receipt({ error: "invalid_grant" }, 200),
        receipt({ error: "invalid_grant" }, 500),
        receipt({ error: "invalid_client" }, 400),
        receipt({ error: "invalid_client" }, 401),
        receipt({ error: "invalid_grant", error_description: 12 }, 400),
        receipt({ error: "invalid_grant", access_token: "private-access" }, 400),
        receipt({ ...tokenBody, expires_in: "60junk" }),
        receipt({ ...tokenBody, expires_in: -1 }),
        receipt({ ...tokenBody, token_type: "DPoP" }),
        { ...receipt(tokenBody), contentType: "text/plain" }
      ]
    ) {
      const failure = yield* OAuth.tokens(raw).pipe(Effect.flip)

      assert.strictEqual(failure._tag, "OAuthUnavailable")
      assert.notInclude(JSON.stringify(failure), "private-")
    }
    assert.strictEqual((yield* OAuth.tokens(receipt({ ...tokenBody, expires_in: 0 }))).expiresIn, 0)
    const omitted = yield* OAuth.tokens(receipt({ ...tokenBody, refresh_token: null }))

    assert.isUndefined(omitted.refreshToken)
    assert.strictEqual(Redacted.value(omitted.accessToken), "private-access")
    const extension = receipt({ error: "bad_verification_code" })

    assert.strictEqual(Redacted.value(extension.body).error, "bad_verification_code")
  }))

it.effect("binds authorization parameters and snapshots configuration before network effects", () =>
  Effect.gen(function*() {
    const mutable = { ...metadata }

    const client = yield* OAuth.make({ ...options, metadata: mutable }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport(() => Response.json(tokenBody))
      )
    )

    mutable.authorization_endpoint = "https://attacker.example/authorize"

    const input: OAuth.AuthorizationInput = {
      redirectUri: "http://127.0.0.1:3000/callback",
      scopes: ["openid", "profile", "r".repeat(256)],
      state: Redacted.make("state"),
      nonce: Redacted.make("nonce"),
      codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      maxAgeSeconds: 0,
      resources: ["urn:one", "urn:two"],
      parameters: { prompt: "consent", resource: "urn:legacy", audience: "api" }
    }

    const url = new URL(Redacted.value(yield* client.authorizationUrl(input)))

    assert.strictEqual(url.origin, "https://issuer.example")
    assert.strictEqual(url.searchParams.get("client_id"), "client")
    assert.strictEqual(url.searchParams.get("response_type"), "code")
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256")
    assert.strictEqual(url.searchParams.get("max_age"), "0")
    assert.deepStrictEqual(url.searchParams.getAll("resource"), ["urn:legacy", "urn:one", "urn:two"])
    assert.strictEqual(url.searchParams.get("audience"), "api")
    assert.strictEqual(
      (yield* client
        .authorizationUrl({ ...input, parameters: { CLIENT_ID: "attacker" } })
        .pipe(Effect.flip))._tag,
      "OAuthConfigurationError"
    )
    assert.strictEqual(
      (yield* client
        .codeGrant({ ...codeInput, parameters: { code: "replacement" } })
        .pipe(Effect.flip))._tag,
      "OAuthConfigurationError"
    )
  }))

it.effect("keeps installed metadata arrays detached and immutable through revocation", () =>
  Effect.gen(function*() {
    const methods = ["client_secret_basic"]
    let calls = 0

    const client = yield* OAuth.make({
      ...options,
      metadata: { ...metadata, revocation_endpoint_auth_methods_supported: methods }
    }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport(() => {
          calls++

          return new Response(null, { status: 200 })
        })
      )
    )

    methods[0] = "client_secret_post"
    const installed = client.metadata.revocation_endpoint_auth_methods_supported!

    const input: OAuth.RevocationInput = {
      token: Redacted.make("private-refresh"),
      tokenTypeHint: "refresh_token"
    }

    assert.deepStrictEqual(installed, ["client_secret_basic"])
    assert.strictEqual((yield* client.revoke(input).pipe(Effect.flip))._tag, "OAuthConfigurationError")
    const changed = Reflect.set(installed, 0, "client_secret_post")
    const revoked = yield* client.revoke(input).pipe(Effect.exit)

    assert.strictEqual(Exit.isFailure(revoked), true)
    assert.strictEqual(changed, false)
    assert.strictEqual(Object.isFrozen(installed), true)
    assert.strictEqual(calls, 0)
  }))

it.effect(
  "refreshes, fetches the installed profile and revokes with separately installed credentials",
  () =>
    Effect.gen(function*() {
      const requests: Array<string> = []

      const client = yield* OAuth.make({
        ...options,
        revocationAuthentication: {
          method: "client_secret_basic",
          secret: Redacted.make("revocation-secret")
        }
      }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport((request) => {
            requests.push(request.url)
            if (request.url === options.profile!.url) {
              assert.strictEqual(request.headers.authorization, "Bearer private-access")
              assert.strictEqual(request.headers["x-api-version"], "2026")

              return Response.json({ id: 42 })
            }
            const body = form(request)

            if (request.url === metadata.token_endpoint) {
              assert.strictEqual(body.get("grant_type"), "refresh_token")
              assert.strictEqual(body.get("refresh_token"), "private-refresh")
              assert.strictEqual(body.has("scope"), false)

              return Response.json(tokenBody)
            }
            assert.strictEqual(body.get("token_type_hint"), "refresh_token")
            assert.strictEqual(body.get("token"), "private-refresh")
            assert.strictEqual(atob(request.headers.authorization.slice(6)), "client:revocation%2Dsecret")

            return new Response(null, { status: 200 })
          })
        )
      )

      yield* OAuth.tokens(
        yield* client.refreshGrant({ refreshToken: Redacted.make("private-refresh") })
      )
      assert.deepStrictEqual(yield* client.fetchProfile(Redacted.make("private-access")), { id: 42 })
      yield* client.revoke({
        token: Redacted.make("private-refresh"),
        tokenTypeHint: "refresh_token"
      })
      assert.deepStrictEqual(requests, [
        metadata.token_endpoint,
        options.profile!.url,
        metadata.revocation_endpoint
      ])
    })
)

it.effect(
  "rejects unsafe endpoints, reserved endpoint queries, unsupported authentication and header injection before dispatch",
  () =>
    Effect.gen(function*() {
      let requests = 0

      const http = transport(() => {
        requests++

        return Response.json(tokenBody)
      })

      for (
        const configured of [
          { ...options, metadata: { ...metadata, token_endpoint: "http://issuer.example/token" } },
          { ...options, metadata: { ...metadata, token_endpoint: "https://issuer.example/token#" } },
          {
            ...options,
            metadata: { ...metadata, token_endpoint: "https://issuer.example/token?client_secret=x" }
          },
          { ...options, metadata: { ...metadata, token_endpoint_auth_methods_supported: ["none"] } },
          {
            ...options,
            profile: { url: "https://api.example/user", headers: { Authorization: "injected" } }
          },
          { ...options, timeoutMs: Infinity }
        ]
      ) {
        assert.strictEqual(
          (yield* OAuth.make(configured).pipe(
            Effect.provideService(HttpClient.HttpClient, http),
            Effect.flip
          ))._tag,
          "OAuthConfigurationError"
        )
      }
      assert.strictEqual(requests, 0)
    })
)

it.effect(
  "bounds bodies, refuses redirects and unexpected URLs, and never repeats failed exchange/revocation",
  () =>
    Effect.gen(function*() {
      for (
        const response of [
          new Response(null, { status: 302, headers: { location: "https://attacker.example" } }),
          new Response("x".repeat(129), { headers: { "content-type": "application/json" } }),
          new Response("{}", { headers: { "content-type": "text/plain" } }),
          Response.json([])
        ]
      ) {
        let count = 0

        const client = yield* OAuth.make({ ...options, maxResponseBytes: 128 }).pipe(
          Effect.provideService(
            HttpClient.HttpClient,
            transport(() => {
              count++

              return response
            })
          )
        )

        assert.strictEqual((yield* client.codeGrant(codeInput).pipe(Effect.flip))._tag, "OAuthUnavailable")
        assert.strictEqual(count, 1)
      }
      const moved = Response.json(tokenBody)

      Object.defineProperty(moved, "url", { value: "https://attacker.example/token" })

      const client = yield* OAuth.make(options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => moved)
        )
      )

      assert.strictEqual((yield* client.codeGrant(codeInput).pipe(Effect.flip))._tag, "OAuthUnavailable")
      let revocations = 0

      const revoke = yield* OAuth.make(options).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          transport(() => {
            revocations++

            return new Response(null, { status: 503 })
          })
        )
      )

      assert.strictEqual(
        (yield* revoke
          .revoke({ token: Redacted.make("private-refresh"), tokenTypeHint: "refresh_token" })
          .pipe(Effect.flip))._tag,
        "OAuthUnavailable"
      )
      assert.strictEqual(revocations, 1)
    })
)

it.effect("rejects deeply nested provider JSON as unavailable without repeating the exchange", () =>
  Effect.gen(function*() {
    const body = "{\"access_token\":\"private-access\",\"token_type\":\"Bearer\",\"extension\":" +
      "{\"x\":".repeat(20000) +
      "0" +
      "}".repeat(20000) +
      "}"

    let calls = 0

    assert.isBelow(new TextEncoder().encode(body).length, 1048576)

    const client = yield* OAuth.make(options).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport(() => {
          calls++

          return new Response(body, { headers: { "content-type": "application/json" } })
        })
      )
    )

    assert.strictEqual((yield* client.codeGrant(codeInput).pipe(Effect.flip))._tag, "OAuthUnavailable")
    assert.strictEqual(calls, 1)
  }))

for (const termination of ["interruption", "timeout"] as const) {
  it.effect(`${termination} aborts a body read with Fetch injection and never repeats the code`, () =>
    Effect.gen(function*() {
      const reading = yield* Deferred.make<void>()
      let cancelled = false
      let calls = 0

      const fetch = mockFetch(async (_request, init) => {
        calls++
        assert.strictEqual(init?.redirect, "manual")
        assert.strictEqual(init?.credentials, "omit")

        return new Response(
          new ReadableStream(
            {
              pull() {
                Deferred.doneUnsafe(reading, Effect.void)
              },
              cancel() {
                cancelled = true
              }
            },
            { highWaterMark: 0 }
          ),
          { headers: { "content-type": "application/json" } }
        )
      })

      const client = yield* OAuth.make({ ...options, timeoutMs: 50 }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provideService(FetchHttpClient.Fetch, fetch)
      )

      const fiber = yield* client.codeGrant(codeInput).pipe(Effect.forkChild)

      yield* Deferred.await(reading)
      if (termination === "interruption") yield* Fiber.interrupt(fiber)
      else {
        yield* TestClock.adjust(50)
        assert.strictEqual((yield* Fiber.join(fiber).pipe(Effect.flip))._tag, "OAuthUnavailable")
      }
      assert.strictEqual(cancelled, true)
      assert.strictEqual(calls, 1)
    }))
}

it.effect("closing the owner scope cancels an active exchange before returning", () =>
  Effect.gen(function*() {
    const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))

    const reading = yield* Deferred.make<void>()
    let cancelled = false
    let aborted = false
    let calls = 0

    const fetch = mockFetch(async (_request, init) => {
      calls++
      init?.signal?.addEventListener("abort", () => {
        aborted = true
      })

      return new Response(
        new ReadableStream(
          {
            pull() {
              Deferred.doneUnsafe(reading, Effect.void)
            },
            async cancel() {
              await Promise.resolve()
              cancelled = true
            }
          },
          { highWaterMark: 0 }
        ),
        { headers: { "content-type": "application/json" } }
      )
    })

    const client = yield* OAuth.make({ ...options, timeoutMs: 60000 }).pipe(
      Effect.provideService(Scope.Scope, scope),
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(FetchHttpClient.Fetch, fetch)
    )

    const fiber = yield* client.codeGrant(codeInput).pipe(Effect.forkChild)

    yield* Deferred.await(reading)
    yield* Scope.close(scope, Exit.void)
    assert.strictEqual(cancelled, true)
    assert.strictEqual(aborted, true)
    assert.strictEqual((yield* Fiber.join(fiber).pipe(Effect.flip))._tag, "OAuthUnavailable")
    assert.strictEqual((yield* client.codeGrant(codeInput).pipe(Effect.flip))._tag, "OAuthUnavailable")
    assert.strictEqual(calls, 1)
  }))

it.effect("invalidates clients when their owning scope closes", () =>
  Effect.gen(function*() {
    const scope = yield* Scope.make()
    let calls = 0

    const client = yield* OAuth.make(options).pipe(
      Effect.provideService(Scope.Scope, scope),
      Effect.provideService(
        HttpClient.HttpClient,
        transport(() => {
          calls++

          return Response.json(tokenBody)
        })
      )
    )

    yield* Scope.close(scope, Exit.void)
    assert.strictEqual((yield* client.codeGrant(codeInput).pipe(Effect.flip))._tag, "OAuthUnavailable")
    assert.strictEqual(calls, 0)
  }))

it.effect("decodes whole decimal expiry strings while preserving the private raw receipt", () =>
  Effect.gen(function*() {
    const raw = receipt({ ...tokenBody, expires_in: "60.5" })

    assert.strictEqual((yield* OAuth.tokens(raw)).expiresIn, 60.5)
    assert.strictEqual(Redacted.value(raw.body).expires_in, "60.5")
    assert.strictEqual(
      (yield* OAuth.tokens(receipt({ ...tokenBody, expires_in: " 60" })).pipe(Effect.flip))._tag,
      "OAuthUnavailable"
    )
    assert.strictEqual(
      (yield* OAuth.tokens(receipt({ ...tokenBody, expires_in: "Infinity" })).pipe(Effect.flip))
        ._tag,
      "OAuthUnavailable"
    )
  }))
