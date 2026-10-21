import * as Jwk from "@effect/auth/jose/Jwk"
import * as Jwt from "@effect/auth/jose/Jwt"
import * as OAuthScope from "@effect/auth/OAuthScope"
import * as OAuthServer from "@effect/auth/OAuthServer"
import { SubjectId } from "@effect/auth/Schema"
import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import { assert, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Clock from "effect/Clock"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import * as TestClock from "effect/testing/TestClock"

import { OAuthServerPersistence } from "@effect/auth-persistence/internal/oauthServer"

const Read = OAuthScope.make("read")
const Write = OAuthScope.make("write")
const server = OAuthServer.make("mcp", { scopes: [Read, Write] })
const origin = "https://app.example.com"
const resource = `${origin}/mcp`
const redirectUri = "https://client.example.com/callback"
const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

const cryptoLayer = NodeCrypto.layer

const config: OAuthServer.Options = {
  origin,
  resource,
  loginPath: "/login",
  clients: [{ clientId: "client", name: "Example <client>", redirectUris: [redirectUri] }],
  keys: {
    activeKeyId: "v1",
    keys: [{ id: "v1", material: Redacted.make(Base64Url.encode(new Uint8Array(32).fill(9))) }]
  }
}

const harness = (
  fault?: Effect.Effect<void, OAuthServer.Unavailable>,
  options: OAuthServer.Options = config,
  http = FetchHttpClient.layer
) => {
  const database = Layer.effectDiscard(
    Effect.gen(function*() {
      for (const migration of OAuthServerPersistence.migrations) {
        yield* (yield* SqlClient.SqlClient).unsafe(migration)
      }
    })
  ).pipe(Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" })))

  const storage = OAuthServerPersistence.layer.pipe(Layer.provideMerge(database))

  const durable = fault
    ? Layer.effect(
      OAuthServer.Persistence,
      Effect.gen(function*() {
        const store = yield* OAuthServer.Persistence

        return OAuthServer.Persistence.of({
          ...store,
          compareAndSet: Effect.fnUntraced(function*(namespace, id, version, record) {
            const saved = yield* store.compareAndSet(namespace, id, version, record)

            if (record.status === "Active" && saved) yield* fault

            return saved
          })
        })
      })
    ).pipe(Layer.provideMerge(storage))
    : storage

  const identity = Layer.succeed(server.Identity, {
    current: Effect.gen(function*() {
      const request = yield* HttpServerRequest.HttpServerRequest
      // Test-only identity authority. Production verifies an application session.
      const user = request.headers["test-user"]

      return user === undefined ? undefined : SubjectId.make(user)
    })
  })

  return server
    .layer(options)
    .pipe(
      Layer.provide(identity),
      Layer.provide(http),
      Layer.provideMerge(durable),
      Layer.provideMerge(cryptoLayer)
    )
}

const get = (path: string, cookie?: string, user = "alice") =>
  new Request(`${origin}${path}`, {
    headers: { "test-user": user, ...(cookie ? { cookie } : {}) }
  })

const post = (path: string, data: Record<string, string>, cookie?: string, user = "alice") =>
  new Request(`${origin}${path}`, {
    method: "POST",
    headers: { "test-user": user, origin, ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams(data)
  })

const body = <S extends Schema.Top>(response: Response, schema: S) =>
  Effect.promise(() => response.json()).pipe(Effect.flatMap(Schema.decodeUnknownEffect(schema)))

const Tokens = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.String,
  scope: Schema.String,
  token_type: Schema.Literal("Bearer"),
  expires_in: Schema.Int
})

const consentToken = (html: string) => {
  const csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1] ?? ""

  assert.notStrictEqual(csrf, "")

  return csrf
}

const start = Effect.fnUntraced(function*(user = "alice", scope = "read", overrides: Record<string, string> = {}) {
  const service = yield* server.Service

  const query = new URLSearchParams({
    response_type: "code",
    client_id: "client",
    redirect_uri: redirectUri,
    resource,
    scope,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "client-state",
    ...overrides
  })

  const response = yield* service.handle(
    get(`${server.paths.authorize}?${query}`, undefined, user)
  )

  assert.strictEqual(response.status, 303)
  const consentCookie = response.headers.getSetCookie()[0]

  // Requested hardening: the browser must enforce a host-only consent cookie on HTTPS.
  assert.strictEqual(consentCookie.split("=", 1)[0], "__Host-yielded-mcp-consent")
  assert.include(
    consentCookie
      .split(";")
      .slice(1)
      .map((attribute) => attribute.trim()),
    "Path=/"
  )
  const cookie = consentCookie.split(";")[0]

  const consent = yield* service.handle(get(server.paths.authorize, cookie, user))

  assert.strictEqual(consent.status, 200)
  const html = yield* Effect.promise(() => consent.text())

  return { service, cookie, csrf: consentToken(html), user, html }
})

const authorize = Effect.fnUntraced(function*(user = "alice", scope = "read", overrides: Record<string, string> = {}) {
  const flow = yield* start(user, scope, overrides)

  const response = yield* flow.service.handle(
    post(server.paths.authorize, { csrf: flow.csrf, decision: "approve" }, flow.cookie, user)
  )

  assert.strictEqual(response.status, 303)
  const redirect = new URL(response.headers.get("location")!)

  return { ...flow, code: redirect.searchParams.get("code")! }
})

const exchange = (code: string) =>
  post(server.paths.token, {
    grant_type: "authorization_code",
    client_id: "client",
    resource,
    redirect_uri: redirectUri,
    code,
    code_verifier: verifier
  })

const issue = Effect.fnUntraced(function*(user = "alice", scope = "read") {
  const flow = yield* authorize(user, scope)
  const response = yield* flow.service.handle(exchange(flow.code))

  assert.strictEqual(response.status, 200)

  return { ...flow, tokens: yield* body(response, Tokens) }
})

const refresh = (token: string) =>
  post(server.paths.token, {
    grant_type: "refresh_token",
    client_id: "client",
    resource,
    refresh_token: token
  })

it.effect("switching accounts invalidates previously rendered consent", () =>
  Effect.gen(function*() {
    const flow = yield* start("alice")
    const consent = yield* flow.service.handle(get(server.paths.authorize, flow.cookie, "bob"))

    assert.strictEqual(consent.status, 200)
    const csrf = consentToken(yield* Effect.promise(() => consent.text()))

    const stale = yield* flow.service.handle(
      post(server.paths.authorize, { csrf: flow.csrf, decision: "approve" }, flow.cookie, "bob")
    )

    assert.strictEqual(stale.status, 400)
    assert.strictEqual(stale.headers.has("location"), false)

    const approved = yield* flow.service.handle(
      post(server.paths.authorize, { csrf, decision: "approve" }, flow.cookie, "bob")
    )

    assert.strictEqual(approved.status, 303)
    const code = new URL(approved.headers.get("location")!).searchParams.get("code")!
    const tokens = yield* body(yield* flow.service.handle(exchange(code)), Tokens)
    const access = yield* flow.service.verify(Redacted.make(tokens.access_token))

    assert.strictEqual(access.subjectId, "bob")
  }).pipe(Effect.provide(harness())))

it.effect("rejects an issued token for another resource under the same authority", () =>
  Effect.gen(function*() {
    const flow = yield* authorize()
    const exchanged = yield* flow.service.handle(exchange(flow.code))
    const tokens = yield* body(exchanged, Tokens)

    yield* flow.service.verify(Redacted.make(tokens.access_token))

    const otherResource = server
      .layer({ ...config, resource: `${origin}/other` })
      .pipe(Layer.provide(Layer.succeed(server.Identity, { current: Effect.succeed(undefined) })))

    const crossResource = yield* Effect.gen(function*() {
      return yield* (yield* server.Service).verify(Redacted.make(tokens.access_token))
    }).pipe(Effect.exit, Effect.provide(otherResource.pipe(Layer.provide(FetchHttpClient.layer))))

    assert.strictEqual(Exit.isFailure(crossResource), true)
  }).pipe(Effect.provide(harness())))

it.effect(
  "concurrent refresh never delivers two grants and a replay disables the winning token",
  () =>
    Effect.gen(function*() {
      const flow = yield* issue()

      const results = yield* Effect.all(
        [
          flow.service.handle(refresh(flow.tokens.refresh_token)),
          flow.service.handle(refresh(flow.tokens.refresh_token))
        ],
        { concurrency: 2 }
      )

      assert.deepStrictEqual(results.map((r) => r.status).sort(), [200, 400])

      const tokens = yield* body(
        results.find((r) => r.status === 200)!,
        Tokens
      )

      assert.strictEqual(
        Exit.isFailure(yield* Effect.exit(flow.service.verify(Redacted.make(tokens.access_token)))),
        true
      )
    }).pipe(Effect.provide(harness()))
)

it.effect("a lost issuance commit returns no credentials and cannot be reissued", () =>
  Effect.gen(function*() {
    const flow = yield* authorize()
    const response = yield* flow.service.handle(exchange(flow.code))

    assert.strictEqual(response.status, 503)
    assert.notInclude(yield* Effect.promise(() => response.text()), "access_token")
    assert.strictEqual((yield* flow.service.handle(exchange(flow.code))).status, 400)
  }).pipe(Effect.provide(harness(Effect.fail(OAuthServer.Unavailable.make({}))))))

it.effect(
  "Effect's MCP HTTP transport receives an isolated authenticated principal on each tool call",
  () =>
    Effect.gen(function*() {
      const alice = yield* issue("alice")
      const bob = yield* issue("bob")

      const toolkit = Toolkit.make(
        Tool.make("whoami", { success: Schema.String, failure: OAuthServer.InvalidToken })
      )

      const tools = McpServer.toolkit(toolkit).pipe(
        Layer.provide(
          toolkit.toLayer({
            whoami: Effect.fnUntraced(function*() {
              const access = yield* OAuthServer.CurrentAccess

              if (access === undefined) return yield* OAuthServer.InvalidToken.make({})

              return access.subjectId
            })
          })
        ),
        Layer.provide(
          McpServer.layerHttp({
            name: "test",
            version: "1",
            path: "/mcp",
            protocols: [McpProtocol.v2026_07_28]
          })
        ),
        Layer.provide(server.middleware([Read]).layer)
      )

      const routes = Layer.mergeAll(tools, server.routes).pipe(
        Layer.provide(Layer.succeed(server.Service, alice.service)),
        Layer.provideMerge(Layer.succeed(Clock.Clock, yield* Clock.Clock))
      )

      yield* Effect.acquireUseRelease(
        Effect.sync(() => HttpRouter.toWebHandler(routes, { disableLogger: true })),
        ({ handler }) =>
          Effect.gen(function*() {
            const send = (token?: string) =>
              Effect.promise(() =>
                handler(
                  new Request(resource, {
                    method: "POST",
                    headers: {
                      "content-type": "application/json",
                      accept: "application/json, text/event-stream",
                      "MCP-Protocol-Version": "2026-07-28",
                      "Mcp-Method": "tools/call",
                      "Mcp-Name": "whoami",
                      ...(token ? { authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                      jsonrpc: "2.0",
                      id: 1,
                      method: "tools/call",
                      params: {
                        name: "whoami",
                        arguments: {},
                        _meta: {
                          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
                          "io.modelcontextprotocol/clientCapabilities": {}
                        }
                      }
                    })
                  })
                )
              )

            const anonymous = yield* send()

            assert.strictEqual(anonymous.status, 401)
            assert.include(
              anonymous.headers.get("www-authenticate"),
              `resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`
            )
            const invalid = yield* send("invalid")

            assert.strictEqual(invalid.status, 401)
            assert.include(invalid.headers.get("www-authenticate"), "error=\"invalid_token\"")
            for (
              const [token, user] of [
                [alice.tokens.access_token, "alice"],
                [bob.tokens.access_token, "bob"],
                [alice.tokens.access_token, "alice"]
              ]
            ) {
              const response = yield* send(token)

              assert.strictEqual(response.status, 200)

              const json = yield* body(
                response,
                Schema.Struct({
                  result: Schema.Struct({
                    content: Schema.Array(Schema.Struct({ text: Schema.String }))
                  })
                })
              )

              assert.strictEqual(json.result.content[0].text, JSON.stringify(user))
            }
          }),
        ({ dispose }) => Effect.promise(dispose)
      )
    }).pipe(Effect.provide(harness()))
)

// User-requested red/green proof against MCP 2026-07-28 and its OAuth 2.1 profile.
// Exercise HTTP + real SQLite; substitute only remote metadata and time so invalid
// documents, cache expiry, and stalled fetches are repeatable without external hosts.
const metadataId = "https://client.example.com/oauth/client.json"

const metadata = {
  client_id: metadataId,
  client_name: "Remote <assistant>",
  redirect_uris: [redirectUri],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "none"
}

const metadataConfig = {
  ...config,
  clientMetadata: { allowedOrigins: ["https://client.example.com"] }
}

const transport = (respond: (url: string) => Response) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) => Effect.sync(() => HttpClientResponse.fromWeb(request, respond(request.url))))
  )

const remoteHarness = (respond: (url: string) => Response, options = metadataConfig) =>
  harness(undefined, options, transport(respond))

const remoteExchange = (code: string, extra: Record<string, string> = {}) =>
  post(server.paths.token, {
    grant_type: "authorization_code",
    client_id: metadataId,
    resource,
    code,
    code_verifier: verifier,
    ...extra
  })

const begin = (extra: Record<string, string> = {}) =>
  get(
    `${server.paths.authorize}?${new URLSearchParams({
      response_type: "code",
      client_id: metadataId,
      redirect_uri: redirectUri,
      resource,
      scope: "read",
      code_challenge: challenge,
      code_challenge_method: "S256",
      ...extra
    })}`
  )

it.effect(
  "CIMD discovery, consent, PKCE exchange, refresh and revocation work without pre-registration",
  () => {
    let fetches = 0

    return Effect.gen(function*() {
      const service = yield* server.Service

      const discovery = yield* body(
        yield* service.handle(get(server.paths.metadata)),
        Schema.Struct({
          client_id_metadata_document_supported: Schema.Boolean,
          authorization_response_iss_parameter_supported: Schema.Boolean
        })
      )

      assert.deepStrictEqual(discovery, {
        client_id_metadata_document_supported: true,
        authorization_response_iss_parameter_supported: true
      })
      const flow = yield* authorize("alice", "read", { client_id: metadataId })

      assert.include(flow.html, "Remote &lt;assistant&gt;")
      assert.include(flow.html, "client.example.com")

      const wrong = yield* flow.service.handle(
        remoteExchange(flow.code, { code_verifier: "x".repeat(43) })
      )

      assert.strictEqual(wrong.status, 400)
      const response = yield* flow.service.handle(remoteExchange(flow.code))

      assert.strictEqual(response.status, 200)
      assert.strictEqual(response.headers.get("cache-control"), "no-store")
      const tokens = yield* body(response, Tokens)
      const access = yield* service.verify(Redacted.make(tokens.access_token))

      assert.strictEqual(access.clientId, metadataId)
      assert.strictEqual(access.subjectId, "alice")

      const rotated = yield* body(
        yield* service.handle(
          post(server.paths.token, {
            grant_type: "refresh_token",
            client_id: metadataId,
            resource,
            refresh_token: tokens.refresh_token
          })
        ),
        Tokens
      )

      assert.deepStrictEqual((yield* service.verify(Redacted.make(rotated.access_token))).scopes, [Read])
      assert.strictEqual(
        (yield* service.handle(
          post(server.paths.revoke, { client_id: metadataId, token: rotated.refresh_token })
        )).status,
        200
      )
      assert.strictEqual(Exit.isFailure(yield* Effect.exit(service.verify(Redacted.make(rotated.access_token)))), true)
      assert.strictEqual(fetches, 1)
    }).pipe(
      Effect.provide(
        remoteHarness(
          () => {
            fetches++

            return Response.json(metadata, { headers: { "cache-control": "max-age=60" } })
          },
          { ...metadataConfig, clients: [] }
        )
      )
    )
  }
)

it.effect("CIMD rejects invalid documents and never caches failures", () => {
  let document: unknown = metadata

  return Effect.gen(function*() {
    const service = yield* server.Service

    for (
      const invalid of [
        { ...metadata, client_id: `${metadataId}?other` },
        { ...metadata, client_name: undefined },
        { ...metadata, redirect_uris: ["http://public.example/callback"] },
        { ...metadata, token_endpoint_auth_method: "private_key_jwt" },
        { ...metadata, token_endpoint_auth_method: "client_secret_post" },
        { ...metadata, client_secret: "must-not-be-public" },
        { ...metadata, client_secret_expires_at: 0 },
        { ...metadata, grant_types: ["client_credentials"] },
        { ...metadata, response_types: ["token"] }
      ]
    ) {
      document = invalid
      const response = yield* service.handle(begin())

      assert.strictEqual(response.status, 400)
      assert.strictEqual(response.headers.has("location"), false)
    }
    document = { ...metadata, extension: "ignored" }
    assert.strictEqual((yield* service.handle(begin({ redirect_uri: "https://other.example/callback" }))).status, 400)
    assert.strictEqual((yield* service.handle(begin())).status, 303)
  }).pipe(
    Effect.provide(
      remoteHarness(() => Response.json(document, { headers: { "cache-control": "max-age=60" } }))
    )
  )
})

it.effect(
  "CIMD fetch policy blocks untrusted URLs, redirects, oversized and malformed responses",
  () => {
    let calls = 0
    let response = () => Response.json(metadata)

    return Effect.gen(function*() {
      const service = yield* server.Service

      for (
        const id of [
          "http://client.example.com/client.json",
          "https://client.example.com",
          "https://client.example.com/",
          "https://client.example.com/a/../client.json",
          "https://client.example.com/%2e/client.json",
          "https://user@client.example.com/client.json",
          `${metadataId}#fragment`,
          "https://127.0.0.1/client.json",
          "https://169.254.169.254/client.json",
          "https://elsewhere.example/client.json"
        ]
      ) {
        assert.strictEqual((yield* service.handle(begin({ client_id: id }))).status, 400)
      }
      assert.strictEqual(calls, 0)
      for (
        const invalid of [
          () => new Response(null, { status: 302, headers: { location: "https://127.0.0.1/private" } }),
          () => new Response("not json", { headers: { "content-type": "application/json" } }),
          () => new Response("x".repeat(5121), { headers: { "content-type": "application/json" } }),
          () => Response.json(metadata, { status: 404 })
        ]
      ) {
        response = invalid
        assert.strictEqual((yield* service.handle(begin())).status, 400)
      }
      response = () => Response.json(metadata)
      assert.strictEqual((yield* service.handle(begin())).status, 303)
    }).pipe(
      Effect.provide(
        remoteHarness(() => {
          calls++

          return response()
        })
      )
    )
  }
)

it.effect(
  "CIMD honors freshness and no-store and revalidates a changed callback before consent",
  () => {
    let calls = 0
    let current = metadata
    let cacheControl = "max-age=2"

    return Effect.gen(function*() {
      const flow = yield* start("alice", "read", { client_id: metadataId })

      assert.strictEqual(calls, 1)
      yield* TestClock.adjust(2000)
      current = { ...metadata, redirect_uris: ["https://client.example.com/changed"] }

      const denied = yield* flow.service.handle(
        post(server.paths.authorize, { csrf: flow.csrf, decision: "approve" }, flow.cookie)
      )

      assert.strictEqual(denied.status, 400)
      assert.strictEqual(denied.headers.has("location"), false)
      current = metadata
      cacheControl = "no-store"
      yield* TestClock.adjust(2000)
      assert.strictEqual((yield* flow.service.handle(begin())).status, 303)
      assert.strictEqual((yield* flow.service.handle(begin())).status, 303)
      assert.strictEqual(calls, 4)
    }).pipe(
      Effect.provide(
        remoteHarness(() => {
          calls++

          return Response.json(current, { headers: { "cache-control": cacheControl } })
        })
      )
    )
  }
)

// Regression in 2aa9a55: unread discovery responses were left to GC cleanup.
// Keep bodies open and use FetchHttpClient itself to observe transport cancellation.
it.effect("discovery cancels rejected responses before releasing the request", () => {
  const responses: Array<Response> = []
  const signals: Array<AbortSignal | null | undefined> = []
  let status = 503
  let contentType = "application/json"

  const fetch: typeof globalThis.fetch = Object.assign(
    (_input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
      const response = new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array(5121))
          }
        }),
        { status, headers: { "content-type": contentType } }
      )

      responses.push(response)
      signals.push(init?.signal)

      return Promise.resolve(response)
    },
    { preconnect: () => {} }
  )

  return Effect.gen(function*() {
    const service = yield* server.Service

    yield* Effect.addFinalizer(() =>
      Effect.promise(async () => {
        for (const response of responses) if (!response.body?.locked) await response.body?.cancel()
      })
    )
    const cancellations: Array<boolean> = []

    for (
      const response of [
        { status: 503, type: "application/json" },
        { status: 200, type: "text/plain" },
        { status: 200, type: "application/json" }
      ]
    ) {
      status = response.status
      contentType = response.type
      assert.strictEqual((yield* service.handle(begin())).status, 400)
      cancellations.push(signals.at(-1)?.aborted ?? false)
    }
    assert.deepStrictEqual(cancellations, [true, true, true])
  }).pipe(
    Effect.provide(
      harness(
        undefined,
        metadataConfig,
        FetchHttpClient.layer.pipe(Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetch)))
      )
    )
  )
})

it.effect("CIMD cancels a stalled metadata request at its deadline", () =>
  Effect.gen(function*() {
    const service = yield* server.Service
    const fiber = yield* Effect.forkChild(service.handle(begin()))

    yield* TestClock.adjust("5 seconds")
    assert.strictEqual((yield* Fiber.join(fiber)).status, 503)
  }).pipe(
    Effect.provide(
      harness(
        undefined,
        metadataConfig,
        Layer.succeed(
          HttpClient.HttpClient,
          HttpClient.make(() => Effect.never)
        )
      )
    )
  ))

it.effect("OAuth 2.1 permits an omitted sole callback and token redirect_uri", () =>
  Effect.gen(function*() {
    const flow = yield* authorize("alice", "read", { redirect_uri: "" })

    const response = yield* flow.service.handle(
      post(server.paths.token, {
        grant_type: "authorization_code",
        client_id: "client",
        resource,
        code: flow.code,
        code_verifier: verifier
      })
    )

    assert.strictEqual(response.status, 200)
  }).pipe(Effect.provide(harness())))

it.effect(
  "native loopback redirects allow variable ports but bind the code to the actual callback",
  () =>
    Effect.gen(function*() {
      const flow = yield* authorize("alice", "read", {
        redirect_uri: "http://127.0.0.1:49152/callback"
      })

      const response = yield* flow.service.handle(
        post(server.paths.token, {
          grant_type: "authorization_code",
          client_id: "client",
          resource,
          code: flow.code,
          code_verifier: verifier,
          redirect_uri: "http://127.0.0.1:49153/callback"
        })
      )

      assert.strictEqual(response.status, 400)
      assert.strictEqual(
        (yield* flow.service.handle(
          post(server.paths.token, {
            grant_type: "authorization_code",
            client_id: "client",
            resource,
            code: flow.code,
            code_verifier: verifier,
            redirect_uri: "http://127.0.0.1:49152/callback"
          })
        )).status,
        200
      )
    }).pipe(
      Effect.provide(
        harness(undefined, {
          ...config,
          clients: [
            {
              clientId: "client",
              name: "Native",
              applicationType: "native",
              redirectUris: ["http://127.0.0.1/callback"]
            }
          ]
        })
      )
    )
)

it.effect("confidential clients must authenticate code exchange, refresh, and revocation", () =>
  Effect.gen(function*() {
    const flow = yield* authorize()

    assert.strictEqual((yield* flow.service.handle(exchange(flow.code))).status, 400)
    const credentials = { client_id: "client", client_secret: "private-client-secret" }

    const exchanged = yield* flow.service.handle(
      post(server.paths.token, {
        ...credentials,
        grant_type: "authorization_code",
        resource,
        code: flow.code,
        code_verifier: verifier
      })
    )

    assert.strictEqual(exchanged.status, 200)
    const tokens = yield* body(exchanged, Tokens)

    assert.strictEqual((yield* flow.service.handle(refresh(tokens.refresh_token))).status, 400)
    assert.strictEqual(
      (yield* flow.service.handle(
        post(server.paths.revoke, { client_id: "client", token: tokens.access_token })
      )).status,
      400
    )

    const basic = post(server.paths.token, {
      grant_type: "refresh_token",
      resource,
      refresh_token: tokens.refresh_token
    })

    basic.headers.set("authorization", `Basic ${btoa("client:private-client-secret")}`)
    const rotated = yield* body(yield* flow.service.handle(basic), Tokens)
    const bad = post(server.paths.revoke, { token: rotated.access_token })

    bad.headers.set("authorization", `Basic ${btoa("client:wrong")}`)
    const rejected = yield* flow.service.handle(bad)

    assert.strictEqual(rejected.status, 401)
    assert.include(rejected.headers.get("www-authenticate"), "Basic")
    assert.strictEqual(
      (yield* flow.service.handle(
        post(server.paths.revoke, { ...credentials, token: rotated.access_token })
      )).status,
      200
    )
    assert.strictEqual(
      Exit.isFailure(yield* Effect.exit(flow.service.verify(Redacted.make(rotated.access_token)))),
      true
    )
  }).pipe(
    Effect.provide(
      harness(undefined, {
        ...config,
        clients: [
          {
            ...config.clients[0],
            clientSecret: Redacted.make("private-client-secret")
          }
        ]
      })
    )
  ))

it.effect("root resource metadata is discoverable", () =>
  Effect.gen(function*() {
    const service = yield* server.Service

    assert.strictEqual(service.resourceMetadata, `${origin}/.well-known/oauth-protected-resource`)
    const response = yield* service.handle(get("/.well-known/oauth-protected-resource"))

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(yield* body(response, Schema.Struct({ resource: Schema.String })), {
      resource: origin
    })
  }).pipe(Effect.provide(harness(undefined, { ...config, resource: origin }))))

it.effect("CIMD does not reuse responses forbidden by shared-cache directives", () => {
  let calls = 0
  let headers: Record<string, string> = {}

  return Effect.gen(function*() {
    const service = yield* server.Service

    for (
      const policy of [
        { "cache-control": "max-age=60, max-age=0" },
        { "cache-control": "max-age=60, private" },
        { "cache-control": "max-age=60", vary: "*" },
        { "cache-control": "max-age=60, s-maxage=0" },
        { "cache-control": "max-age=60", age: "60" }
      ]
    ) {
      headers = policy
      const before = calls

      assert.strictEqual((yield* service.handle(begin())).status, 303)
      assert.strictEqual((yield* service.handle(begin())).status, 303)
      assert.strictEqual(calls - before, 2)
    }
  }).pipe(
    Effect.provide(
      remoteHarness(() => {
        calls++

        return Response.json(metadata, { headers })
      })
    )
  )
})

it.effect(
  "authorization ignores unknown extensions but rejects duplicate recognized parameters",
  () =>
    Effect.gen(function*() {
      const service = yield* server.Service
      const request = begin({ client_id: "client" })
      const duplicate = new URL(request.url)

      duplicate.searchParams.append("client_id", "")
      assert.strictEqual((yield* service.handle(new Request(duplicate))).status, 400)
      const extension = new URL(request.url)

      extension.searchParams.append("extension", "one")
      extension.searchParams.append("extension", "two")
      assert.strictEqual((yield* service.handle(new Request(extension))).status, 303)
    }).pipe(Effect.provide(harness()))
)

it.effect("CIMD rejects a client ID without an HTTPS authority delimiter", () =>
  Effect.gen(function*() {
    const service = yield* server.Service

    assert.strictEqual(
      (yield* service.handle(begin({ client_id: "https:client.example.com/oauth/client.json" })))
        .status,
      400
    )
  }).pipe(
    Effect.provide(
      remoteHarness(() => Response.json({ ...metadata, client_id: "https:client.example.com/oauth/client.json" }))
    )
  ))

it.effect("authorization errors return to a validated callback with state and issuer", () =>
  Effect.gen(function*() {
    const service = yield* server.Service

    for (
      const [input, error] of [
        [{ response_type: "token" }, "unsupported_response_type"],
        [{ scope: "unknown" }, "invalid_scope"],
        [{ resource: "https://app.example.com/other" }, "invalid_target"]
      ] as const
    ) {
      const response = yield* service.handle(
        begin({ client_id: "client", state: "error-state", ...input })
      )

      assert.strictEqual(response.status, 303)
      const callback = new URL(response.headers.get("location")!)

      assert.strictEqual(callback.origin + callback.pathname, redirectUri)
      assert.strictEqual(callback.searchParams.get("error"), error)
      assert.strictEqual(callback.searchParams.get("state"), "error-state")
      assert.strictEqual(callback.searchParams.get("iss"), origin)
      assert.strictEqual(callback.searchParams.has("code"), false)
    }

    const invalid = yield* service.handle(
      begin({
        client_id: "client",
        redirect_uri: "https://attacker.example/callback",
        scope: "unknown"
      })
    )

    assert.strictEqual(invalid.status, 400)
    assert.strictEqual(invalid.headers.has("location"), false)
    const unauthenticated = begin({ client_id: "client", scope: "unknown" })

    unauthenticated.headers.delete("test-user")
    const local = yield* service.handle(unauthenticated)

    assert.strictEqual(local.status, 400)
    assert.strictEqual(local.headers.has("location"), false)
  }).pipe(Effect.provide(harness())))

// User-requested private_key_jwt proof: real JOSE + SQLite, with only remote
// documents, time, and a lost persistence acknowledgment under test control.
const assertionType = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
const jwksUri = "https://client.example.com/keys.json"

const signingKeys = Effect.gen(function*() {
  const pair = yield* Effect.promise(() =>
    globalThis.crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify"
    ])
  )

  const publicKey = yield* Effect.promise(() => globalThis.crypto.subtle.exportKey("jwk", pair.publicKey))

  const privateKey = yield* Effect.promise(() => globalThis.crypto.subtle.exportKey("jwk", pair.privateKey))

  const key = yield* Jwk.importPrivate(Redacted.make(privateKey), "ES256")
  const jwk = yield* Schema.decodeUnknownEffect(Jwk.PublicJwk)({ ...publicKey, kid: "client-key" })

  return { key, jwks: { keys: [jwk] } }
})

const assertion = Effect.fnUntraced(function*(
  key: Jwk.SigningKey,
  jti: string,
  claims: { readonly [K in keyof Jwt.RegisteredClaims]?: Jwt.RegisteredClaims[K] | undefined } = {},
  clientId = metadataId
) {
  const now = Math.floor((yield* Clock.currentTimeMillis) / 1000)

  const payload = yield* Schema.decodeEffect(Jwt.RegisteredClaims)(
    Object.fromEntries(
      Object.entries({
        iss: clientId,
        sub: clientId,
        aud: `${origin}${server.paths.token}`,
        exp: now + 60,
        jti,
        ...claims
      }).filter(([, value]) => value !== undefined)
    )
  )

  const jwt = yield* Jwt.sign(Jwt.RegisteredClaims, payload, key, {
    alg: key.algorithm === "dir" ? "HS256" : key.algorithm,
    kid: "client-key"
  })

  return { client_assertion_type: assertionType, client_assertion: Redacted.value(jwt) }
})

it.effect("private_key_jwt CIMD authenticates exchange, refresh and revocation", () => {
  let jwks: unknown
  let keyFetches = 0

  return Effect.gen(function*() {
    const keys = yield* signingKeys

    jwks = keys.jwks
    const service = yield* server.Service

    const discovery = yield* body(
      yield* service.handle(get(server.paths.metadata)),
      Schema.Struct({
        token_endpoint_auth_methods_supported: Schema.Array(Schema.String),
        token_endpoint_auth_signing_alg_values_supported: Schema.Array(Schema.String)
      })
    )

    assert.include(discovery.token_endpoint_auth_methods_supported, "private_key_jwt")
    assert.include(discovery.token_endpoint_auth_signing_alg_values_supported, "RS256")
    const flow = yield* authorize("alice", "read", { client_id: metadataId })

    assert.strictEqual((yield* service.handle(remoteExchange(flow.code))).status, 400)

    const tokens = yield* body(
      yield* service.handle(remoteExchange(flow.code, yield* assertion(keys.key, "exchange"))),
      Tokens
    )

    const rotated = yield* body(
      yield* service.handle(
        post(server.paths.token, {
          grant_type: "refresh_token",
          resource,
          refresh_token: tokens.refresh_token,
          ...(yield* assertion(keys.key, "refresh", { aud: origin }))
        })
      ),
      Tokens
    )

    assert.strictEqual(
      (yield* service.handle(
        post(server.paths.revoke, {
          token: rotated.access_token,
          ...(yield* assertion(keys.key, "revoke", { aud: `${origin}${server.paths.revoke}` }))
        })
      )).status,
      200
    )
    assert.strictEqual(Exit.isFailure(yield* Effect.exit(service.verify(Redacted.make(rotated.access_token)))), true)
    assert.strictEqual(keyFetches, 1)
  }).pipe(
    Effect.provide(
      remoteHarness((url) => {
        if (url === jwksUri) keyFetches++

        return Response.json(
          url === jwksUri
            ? jwks
            : {
              ...metadata,
              token_endpoint_auth_method: "private_key_jwt",
              jwks_uri: jwksUri
            },
          { headers: { "cache-control": "max-age=60" } }
        )
      })
    )
  )
})

it.effect(
  "private_key_jwt binds static clients, claims, algorithms and authentication methods",
  () =>
    Effect.gen(function*() {
      const keys = yield* signingKeys
      const other = yield* signingKeys

      const symmetric = yield* Jwk.importSecret(
        Redacted.make({ kty: "oct", k: Base64Url.encode(new Uint8Array(32).fill(7)) }),
        "HS256"
      )

      const now = Math.floor((yield* Clock.currentTimeMillis) / 1000)

      const options = {
        ...config,
        clients: [{ ...config.clients[0], clientAssertion: { jwks: keys.jwks } }]
      }

      yield* Effect.gen(function*() {
        const service = yield* server.Service

        const send = (credentials: Record<string, string>) =>
          service.handle(
            post(server.paths.revoke, { client_id: "client", token: "unknown", ...credentials })
          )

        assert.strictEqual((yield* send({})).status, 400)
        for (
          const claims of [
            { iss: "other" },
            { sub: "other" },
            { aud: "https://other.example" },
            { exp: now },
            { exp: undefined },
            { exp: now + 301 },
            { nbf: now + 30 },
            { iat: now + 30 },
            { jti: undefined }
          ]
        ) {
          const response = yield* send(
            yield* assertion(keys.key, "invalid-claims", claims, "client")
          )

          assert.strictEqual(response.status, 400)
          assert.deepStrictEqual(yield* body(response, Schema.Struct({ error: Schema.String })), {
            error: "invalid_client"
          })
        }
        for (const key of [other.key, symmetric]) {
          assert.strictEqual((yield* send(yield* assertion(key, "wrong-key", {}, "client"))).status, 400)
        }
        const valid = yield* assertion(keys.key, "valid", {}, "client")

        assert.strictEqual((yield* send({ ...valid, client_secret: "mixed" })).status, 400)
        assert.strictEqual((yield* send({ ...valid, client_assertion_type: "wrong" })).status, 400)
        const basic = post(server.paths.revoke, { token: "unknown", ...valid })

        basic.headers.set("authorization", `Basic ${btoa("client:mixed")}`)
        assert.strictEqual((yield* service.handle(basic)).status, 400)
        assert.strictEqual((yield* send(valid)).status, 200)
      }).pipe(Effect.provide(harness(undefined, options)))
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect(
  "private_key_jwt replay receipts survive races, new server Layers and lost acknowledgments",
  () =>
    Effect.gen(function*() {
      const keys = yield* signingKeys

      const options = {
        ...config,
        clients: [{ ...config.clients[0], clientAssertion: { jwks: keys.jwks } }]
      }

      yield* Effect.gen(function*() {
        const store = yield* OAuthServer.Persistence
        const service = yield* server.Service
        const signed = yield* assertion(keys.key, "race", {}, "client")

        const request = () => post(server.paths.revoke, { client_id: "client", token: "unknown", ...signed })

        const raced = yield* Effect.all([service.handle(request()), service.handle(request())], {
          concurrency: 2
        })

        assert.deepStrictEqual(raced.map((response) => response.status).sort(), [200, 400])

        const fresh = server
          .layer(options)
          .pipe(
            Layer.provide(Layer.succeed(server.Identity, { current: Effect.succeed(undefined) })),
            Layer.provide(FetchHttpClient.layer)
          )

        const again = yield* Effect.gen(function*() {
          return yield* (yield* server.Service).handle(request())
        }).pipe(Effect.provide(fresh))

        assert.strictEqual(again.status, 400)

        const lost = yield* assertion(keys.key, "lost-ack", {}, "client")

        const lostRequest = () => post(server.paths.revoke, { client_id: "client", token: "unknown", ...lost })

        const failed = yield* Effect.gen(function*() {
          return yield* (yield* server.Service).handle(lostRequest())
        }).pipe(
          Effect.provide(fresh),
          Effect.provideService(OAuthServer.Persistence, {
            ...store,
            consumeAssertion: (namespace, receipt) =>
              store
                .consumeAssertion(namespace, receipt)
                .pipe(Effect.andThen(OAuthServer.Unavailable.make({})))
          })
        )

        assert.strictEqual(failed.status, 503)
        assert.strictEqual((yield* service.handle(lostRequest())).status, 400)
        assert.strictEqual(
          (yield* service.handle(
            post(server.paths.revoke, {
              client_id: "client",
              token: "unknown",
              ...(yield* assertion(keys.key, "fresh", {}, "client"))
            })
          )).status,
          200
        )
      }).pipe(Effect.provide(harness(undefined, options)))
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect("private_key_jwt validates CIMD key sources and refreshes expired JWKS", () => {
  let document: unknown
  let keySet: unknown
  const fetched: Array<string> = []

  return Effect.gen(function*() {
    const keys = yield* signingKeys
    const rotated = yield* signingKeys

    keySet = keys.jwks
    const service = yield* server.Service
    const signed = yield* assertion(keys.key, "key-policy")

    const send = (credentials = signed) =>
      service.handle(
        post(server.paths.revoke, { client_id: metadataId, token: "unknown", ...credentials })
      )

    const confidential = { ...metadata, token_endpoint_auth_method: "private_key_jwt" }

    for (
      const fields of [
        { jwks_uri: "https://attacker.example/keys" },
        { jwks_uri: "https://127.0.0.1/keys" },
        { jwks_uri: jwksUri, jwks: keys.jwks },
        { jwks: { keys: [{ kty: "oct", k: "secret" }] } },
        { jwks: { keys: [{ ...keys.jwks.keys[0], d: "secret" }] } }
      ]
    ) {
      document = { ...confidential, ...fields }
      assert.strictEqual((yield* send()).status, 400)
    }
    assert.strictEqual(fetched.every((url) => url === metadataId), true)
    document = { ...confidential, jwks: keys.jwks, token_endpoint_auth_signing_alg: "RS256" }
    assert.strictEqual((yield* send()).status, 400)
    document = { ...confidential, jwks: keys.jwks }
    assert.strictEqual((yield* send()).status, 200)
    document = { ...confidential, jwks_uri: jwksUri }
    assert.strictEqual((yield* send(yield* assertion(keys.key, "before-rotation"))).status, 200)
    keySet = rotated.jwks
    yield* TestClock.adjust("2 seconds")
    assert.strictEqual((yield* send(yield* assertion(keys.key, "retired"))).status, 400)
    assert.strictEqual((yield* send(yield* assertion(rotated.key, "rotated"))).status, 200)
    assert.lengthOf(fetched.filter((url) => url === jwksUri), 2)
  }).pipe(
    Effect.provide(
      remoteHarness((url) => {
        fetched.push(url)

        return Response.json(url === jwksUri ? keySet : document, {
          headers: { "cache-control": url === jwksUri ? "max-age=1" : "no-store" }
        })
      })
    )
  )
})
