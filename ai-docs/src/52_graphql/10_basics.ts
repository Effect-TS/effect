/**
 * @title Getting started with GraphQL clients
 *
 * Define a query, build a typed client service over HTTP with an auth
 * middleware, and page through a cursor connection.
 */
import { Config, Context, Effect, Layer, Redacted, Schema, Stream } from "effect"
import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLMiddleware, GraphQLProtocol } from "effect/graphql"
import { FetchHttpClient } from "effect/http"

// Operations are usually generated: write them in `.graphql` files and run
// `graphqlgen` from `@effect/graphql-generator`, which writes a `.graphql.ts`
// module like the one below next to each document.
//
//   query RepoIssues($owner: String!, $name: String!, $after: String) {
//     repository(owner: $owner, name: $name) {
//       issues(first: 50, after: $after) {
//         pageInfo { hasNextPage endCursor }
//         nodes { number title }
//       }
//     }
//   }
export const RepoIssues = GraphQL.query("RepoIssues", {
  document:
    "query RepoIssues($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){issues(first:50,after:$after){pageInfo{hasNextPage endCursor}nodes{number title}}}}",
  variables: {
    owner: Schema.String,
    name: Schema.String,
    after: Schema.optional(Schema.NullOr(Schema.String))
  },
  result: Schema.Struct({
    repository: Schema.NullOr(Schema.Struct({
      issues: Schema.Struct({
        pageInfo: Schema.Struct({ hasNextPage: Schema.Boolean, endCursor: Schema.NullOr(Schema.String) }),
        nodes: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.Struct({ number: Schema.Int, title: Schema.String }))))
      })
    }))
  })
})

// A middleware is a service that wraps every operation it is attached to.
// `mapRequest` builds one from a single request transform.
export class GitHubAuth extends GraphQLMiddleware.Service<GitHubAuth>()("app/GitHubAuth") {
  static readonly layer = Layer.effect(
    GitHubAuth,
    Effect.gen(function*() {
      const token = yield* Config.Redacted("GITHUB_TOKEN")
      return GraphQLMiddleware.mapRequest((request) =>
        Effect.succeed({
          ...request,
          headers: { ...request.headers, authorization: `Bearer ${Redacted.value(token)}` }
        })
      )
    })
  )
}

// A group is the set of operations a client exposes; the generator emits one
// per file. Attaching the middleware makes `GraphQLClient.make` require it.
const GitHubOperations = GraphQLGroup.make(RepoIssues).middleware(GitHubAuth)

// The client has one method per operation, named after it.
export class GitHub extends Context.Service<GitHub>()("app/GitHub", {
  make: GraphQLClient.make(GitHubOperations)
}) {
  static readonly layer = Layer.effect(GitHub, GitHub.make).pipe(
    Layer.provide(GitHubAuth.layer),
    // Queries and mutations are sent as `POST`. Subscriptions use graphql-sse
    // here, or graphql-ws with `GraphQLProtocol.layerWebSocket`.
    Layer.provide(GraphQLProtocol.layerHttp({ url: "https://api.github.com/graphql" })),
    Layer.provide(FetchHttpClient.layer)
  )
}

export const program = Effect.gen(function*() {
  const github = yield* GitHub

  // Variables are encoded and the result decoded through the Schemas. Any
  // `errors` in the response fail with a `GraphQLClientError`; pass
  // `{ partial: true }` as the second argument to get them with the data.
  const { repository } = yield* github.RepoIssues({ owner: "Effect-TS", name: "effect" })
  yield* Effect.log(`First page has ${repository?.issues.nodes?.length ?? 0} issues`)

  // `items` pages through the connection by driving `$after`, one request at
  // a time and only as the stream is pulled.
  const titles = yield* GraphQLClient.items(github.RepoIssues, {
    variables: { owner: "Effect-TS", name: "effect" },
    connection: (result) => result.repository?.issues
  }).pipe(
    Stream.take(120),
    Stream.map((issue) => issue?.title),
    Stream.runCollect
  )
  yield* Effect.log(`Fetched ${titles.length} issues`)
}).pipe(Effect.provide(GitHub.layer))
