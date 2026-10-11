/**
 * @title Batching lookups with GraphQLResolver
 *
 * Collect concurrent lookups by id into one `nodes(ids:)` request with
 * `GraphQLResolver`, instead of one request per id.
 */
import { Effect, Layer, RequestResolver, Schema } from "effect"
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

export const repoNames = (ids: ReadonlyArray<string>) =>
  Effect.gen(function*() {
    const client = yield* GraphQLClient.make(GraphQLGroup.make(RepoNodes).middleware(GitHubAuth))

    // `ordered` matches the `nodes` list to the ids by position. `path` leads
    // from the result to the list, and `typename` narrows each entry to
    // `Repository`: a `null` entry or a node of another type fails only its
    // own lookup, with `Cause.NoSuchElementError`. GitHub accepts up to 100
    // ids per call, so cap the batch with `RequestResolver.batchN`.
    //
    // For results in any order, such as a search, `GraphQLResolver.findById`
    // matches them by a key read from each result instead.
    const RepoById = GraphQLResolver.ordered(client.RepoNodes, {
      variables: (ids: ReadonlyArray<string>) => ({ ids }),
      path: ["nodes"],
      typename: "Repository"
    }).pipe(RequestResolver.batchN(100))
    const getRepo = GraphQLResolver.request(RepoById)

    // The concurrent lookups below are sent as one request per 100 ids.
    const repos = yield* Effect.forEach(ids, getRepo, { concurrency: "unbounded" })
    return repos.map((repo) => repo.nameWithOwner)
  }).pipe(
    Effect.provide([
      GitHubAuth.layer,
      GraphQLProtocol.layerHttp({ url: "https://api.github.com/graphql" }).pipe(Layer.provide(FetchHttpClient.layer))
    ])
  )
