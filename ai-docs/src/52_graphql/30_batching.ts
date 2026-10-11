/**
 * @title Batching lookups with GraphQLResolver
 *
 * Collect concurrent lookups by id into one `nodes(ids:)` request with
 * `GraphQLResolver`, instead of one request per id.
 */
import { Context, Effect, Layer, RequestResolver, Schema } from "effect"
import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol, GraphQLResolver } from "effect/graphql"
import { FetchHttpClient } from "effect/http"
import { GitHubAuth } from "./10_basics.ts"

// Generated from:
//
//   query RepoNodes($ids: [ID!]!) {
//     nodes(ids: $ids) { __typename ... on Repository { nameWithOwner } }
//   }
//
// `nodes` holds a `__typename` union: the selected `Repository`, plus a last
// member for every other type.
export const RepoNodes = GraphQL.query("RepoNodes", {
  document: "query RepoNodes($ids:[ID!]!){nodes(ids:$ids){__typename ...on Repository{nameWithOwner}}}",
  variables: { ids: Schema.Array(Schema.String) },
  result: Schema.Struct({
    nodes: Schema.Array(Schema.NullOr(Schema.Union([
      Schema.Struct({ __typename: Schema.Literal("Repository"), nameWithOwner: Schema.String }),
      Schema.Struct({ __typename: GraphQL.otherTypename<"Issue" | "Repository" | "User">()(["Repository"]) })
    ])))
  })
})

export class GitHub extends Context.Service<GitHub>()("app/GitHub", {
  make: Effect.gen(function*() {
    const client = yield* GraphQLClient.make(GraphQLGroup.make(RepoNodes).middleware(GitHubAuth))

    // Match nodes by position and narrow to Repository. Null entries and
    // other types fail their lookup with Cause.NoSuchElementError.
    // GitHub accepts up to 100 ids per call.
    const RepoById = GraphQLResolver.ordered(client.RepoNodes, {
      variables: (ids: ReadonlyArray<string>) => ({ ids }),
      path: ["nodes"],
      typename: "Repository"
    }).pipe(RequestResolver.batchN(100))
    return { ...client, getRepo: GraphQLResolver.request(RepoById) }
  })
}) {
  static readonly layer = Layer.effect(GitHub, GitHub.make).pipe(
    Layer.provide(GitHubAuth.layer),
    Layer.provide(GraphQLProtocol.layerHttp({ url: "https://api.github.com/graphql" })),
    Layer.provide(FetchHttpClient.layer)
  )
}

export const repoNames = Effect.fn("repoNames")(function*(ids: ReadonlyArray<string>) {
  const github = yield* GitHub
  // Concurrent lookups share the service's resolver, with at most 100 ids per request.
  const repos = yield* Effect.forEach(ids, github.getRepo, { concurrency: "unbounded" })
  return repos.map((repo) => repo.nameWithOwner)
})

export const program = repoNames(["R_1", "R_2"]).pipe(
  Effect.provide(GitHub.layer)
)
