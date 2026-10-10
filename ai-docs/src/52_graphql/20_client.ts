/**
 * @title Building a client over HTTP
 *
 * Turn a group into a typed client service with `GraphQLClient.make`, send it
 * over HTTP with `GraphQLProtocol.layerHttp`, and add an auth header to every
 * request with a `GraphQLMiddleware.mapRequest` middleware.
 */
import { Config, Context, Effect, Layer, Redacted } from "effect"
import { GraphQLClient, GraphQLMiddleware, GraphQLProtocol } from "effect/graphql"
import { FetchHttpClient } from "effect/http"
import { GitHubOperations } from "./10_generated-operations.ts"

// A middleware is a service tag whose value wraps every operation it is
// attached to. It sees the encoded request before the transport does and the
// raw `ExecutionResult` that comes back.
export class GitHubAuth extends GraphQLMiddleware.Service<GitHubAuth>()("app/GitHubAuth") {
  static readonly layer = Layer.effect(
    GitHubAuth,
    Effect.gen(function*() {
      // Read the token once, when the layer is built.
      const token = yield* Config.Redacted("GITHUB_TOKEN")
      // `mapRequest` builds a middleware from one request transform. It applies
      // to queries, mutations and subscriptions alike.
      return GraphQLMiddleware.mapRequest((request) =>
        Effect.succeed({
          ...request,
          headers: { ...request.headers, authorization: `Bearer ${Redacted.value(token)}` }
        })
      )
    })
  )
}

// The client is a service like any other. Attaching `GitHubAuth` to the group
// makes `GraphQLClient.make` require it, so forgetting the middleware layer is
// a type error where the client is built, not a 401 at runtime.
export class GitHub extends Context.Service<GitHub>()("app/GitHub", {
  make: GraphQLClient.make(GitHubOperations.middleware(GitHubAuth))
}) {
  static readonly layer = Layer.effect(GitHub, GitHub.make).pipe(
    Layer.provide(GitHubAuth.layer),
    // Queries and mutations are sent as `POST` with a JSON body. GitHub has no
    // subscriptions; for servers that do, see the subscriptions example.
    Layer.provide(GraphQLProtocol.layerHttp({ url: "https://api.github.com/graphql" })),
    Layer.provide(FetchHttpClient.layer)
  )
}

export const program = Effect.gen(function*() {
  const github = yield* GitHub

  // An operation without variables is called with no arguments.
  const { viewer } = yield* github.Viewer()
  yield* Effect.log(`Signed in as ${viewer.login}`)

  // Variables are passed as their decoded type and encoded through the
  // generated Schema, so `states` is checked against the `IssueState` enum.
  const { repository } = yield* github.RepoIssues({ owner: "Effect-TS", name: "effect", states: ["OPEN"] })
  const first = repository?.issues.nodes?.[0]
  if (first == null) return

  // Per-call options come after the variables. `headers` are sent by the HTTP
  // transport only, and middleware can read them either way.
  yield* github.AddComment(
    { subjectId: first.id, body: "Thanks for the report!" },
    { headers: { "x-request-id": crypto.randomUUID() } }
  )
}).pipe(Effect.provide(GitHub.layer))
