/**
 * Regression tests for GitHub issue #6121:
 * "@effect/platform HttpApi: middleware is skipped"
 * https://github.com/Effect-TS/effect/issues/6121
 *
 * Verifies that API-level middleware defined with `.middleware()` is correctly
 * applied when using `HttpLayerRouter.addHttpApi` with multiple APIs combined
 * via `Layer.mergeAll`.
 */
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSecurity,
  HttpLayerRouter
} from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Schema } from "effect"

// --- Domain Types ---

class Session extends Context.Tag("test/LRMw/Session")<
  Session,
  { readonly id: string }
>() {}

// Security middleware with `provides: Session` — applied at the API level
class InternalAuthorization extends HttpApiMiddleware.Tag<InternalAuthorization>()(
  "test/LRMw/InternalAuthorization",
  {
    failure: HttpApiError.Unauthorized,
    provides: Session,
    security: { apiKey: HttpApiSecurity.bearer }
  }
) {}

// --- APIs ---

// External API — no authentication required
const externalApi = HttpApi.make("external-api").add(
  HttpApiGroup.make("Posts")
    .add(HttpApiEndpoint.get("posts", "/").addSuccess(Schema.String))
    .prefix("/posts")
)

// Internal API — API-level middleware applied to all endpoints
// Two groups are included to match the issue reproduction exactly
const internalApi = HttpApi.make("internal-api")
  .add(
    HttpApiGroup.make("Customers")
      .add(HttpApiEndpoint.get("customers", "/").addSuccess(Schema.Array(Schema.String)))
      .prefix("/customers")
  )
  .add(
    HttpApiGroup.make("Users")
      .add(HttpApiEndpoint.get("users", "/").addSuccess(Schema.Array(Schema.String)))
      .prefix("/users")
  )
  .middleware(InternalAuthorization)

// --- Handlers ---

const PostsLive = HttpApiBuilder.group(externalApi, "Posts", (handlers) =>
  handlers.handle("posts", () => Effect.succeed("ok"))
)

// Users handler: does NOT use Session (but should still be guarded by middleware)
const UsersLive = HttpApiBuilder.group(internalApi, "Users", (handlers) =>
  handlers.handle("users", () => Effect.succeed(["user1", "user2"]))
)

// Customers handler: uses Session (provided by the middleware upon auth success)
const CustomersLive = HttpApiBuilder.group(internalApi, "Customers", (handlers) =>
  handlers.handle(
    "customers",
    () =>
      Effect.gen(function*() {
        const session = yield* Session
        return ["customer1", "customer2", session.id]
      })
  )
)

// --- Middleware implementations ---

// Rejects all requests — used to verify middleware enforcement
const RejectAllAuth = Layer.succeed(InternalAuthorization, {
  apiKey: (_token) => Effect.fail(new HttpApiError.Unauthorized())
})

// Accepts all requests and provides a mock session
const AcceptAllAuth = Layer.succeed(InternalAuthorization, {
  apiKey: (_token) => Effect.succeed({ id: "test-session-123" })
})

// --- Test server setup (mirrors the issue reproduction pattern) ---

const ExternalRoutes = HttpLayerRouter.addHttpApi(externalApi).pipe(
  Layer.provide(PostsLive)
)

const makeInternalRoutes = (auth: Layer.Layer<InternalAuthorization>) =>
  HttpLayerRouter.addHttpApi(internalApi).pipe(
    Layer.provide([UsersLive, CustomersLive]),
    Layer.provide(auth)
  )

const makeTestServer = (auth: Layer.Layer<InternalAuthorization>) =>
  HttpLayerRouter.serve(
    Layer.mergeAll(ExternalRoutes, makeInternalRoutes(auth)),
    { disableLogger: true }
  ).pipe(Layer.provideMerge(NodeHttpServer.layerTest))

// --- Tests ---

describe("HttpLayerRouter - API-level middleware (issue #6121)", () => {
  describe("with rejecting middleware", () => {
    const TestServer = makeTestServer(RejectAllAuth)

    it.effect(
      "users endpoint is protected — returns 401 not 200",
      () =>
        Effect.gen(function*() {
          // Bug: without the fix this returned 200 (middleware was silently skipped)
          const client = yield* HttpApiClient.make(internalApi)
          const result = yield* client.Users.users().pipe(Effect.flip)
          assert.instanceOf(
            result,
            HttpApiError.Unauthorized,
            "Expected 401 Unauthorized from middleware, got something else (middleware may be skipped)"
          )
        }).pipe(Effect.provide(TestServer))
    )

    it.effect(
      "customers endpoint is protected — returns 401 not 500",
      () =>
        Effect.gen(function*() {
          // Bug: without the fix this returned 500 "Service not found: Session"
          // because the middleware never ran to inject the Session service
          const client = yield* HttpApiClient.make(internalApi)
          const result = yield* client.Customers.customers().pipe(Effect.flip)
          assert.instanceOf(
            result,
            HttpApiError.Unauthorized,
            "Expected 401 Unauthorized from middleware, got something else (Session may have leaked)"
          )
        }).pipe(Effect.provide(TestServer))
    )

    it.effect(
      "external API routes remain accessible without authentication",
      () =>
        Effect.gen(function*() {
          const client = yield* HttpApiClient.make(externalApi)
          const result = yield* client.Posts.posts()
          assert.strictEqual(result, "ok")
        }).pipe(Effect.provide(TestServer))
    )
  })

  describe("with accepting middleware", () => {
    const TestServer = makeTestServer(AcceptAllAuth)

    it.effect(
      "users endpoint is accessible with valid auth — middleware provides Session",
      () =>
        Effect.gen(function*() {
          const client = yield* HttpApiClient.make(internalApi)
          const users = yield* client.Users.users()
          assert.deepStrictEqual(users, ["user1", "user2"])
        }).pipe(Effect.provide(TestServer))
    )

    it.effect(
      "customers endpoint receives Session from middleware and returns data",
      () =>
        Effect.gen(function*() {
          const client = yield* HttpApiClient.make(internalApi)
          const customers = yield* client.Customers.customers()
          assert.deepStrictEqual(customers, ["customer1", "customer2", "test-session-123"])
        }).pipe(Effect.provide(TestServer))
    )
  })
})
