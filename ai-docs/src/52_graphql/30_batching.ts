/**
 * @title Batching lookups with GraphQLResolver
 *
 * Collect concurrent lookups by id into one `nodes(ids:)` request with
 * `GraphQLResolver`, instead of one request per id.
 */
import { type Cause, Context, Effect, Layer, RequestResolver, Schema } from "effect"
import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol, GraphQLResolver } from "effect/graphql"
import { FetchHttpClient } from "effect/http"
import { GitHubAuth } from "./10_basics.ts"

// Generated from:
//
//   query RepoNodes($ids: [ID!]!) {
//     nodes(ids: $ids) { __typename ... on Repository { nameWithOwner } }
//   }
//
// Unselected node types are represented by `otherTypename`.
export class RepoNodesRepository extends Schema.Opaque<RepoNodesRepository>()(
  Schema.Struct({ __typename: Schema.Literal("Repository"), nameWithOwner: Schema.String })
) {}

export class RepoNodesNodeOther extends Schema.Opaque<RepoNodesNodeOther>()(
  Schema.Struct({ __typename: GraphQL.otherTypename<"Issue" | "Repository" | "User">()(["Repository"]) })
) {}

export const RepoNodes = GraphQL.query("RepoNodes", {
  document: "query RepoNodes($ids:[ID!]!){nodes(ids:$ids){__typename ...on Repository{nameWithOwner}}}",
  variables: { ids: Schema.Array(Schema.String) },
  result: Schema.Struct({
    nodes: Schema.Array(Schema.NullOr(Schema.Union([RepoNodesRepository, RepoNodesNodeOther])))
  })
})

export const GitHubGraphQLGroup = GraphQLGroup.make(RepoNodes).middleware(GitHubAuth)

export class GitHub extends Context.Service<
  GitHub,
  GraphQLClient.FromGroup<typeof GitHubGraphQLGroup> & {
    getRepo(id: string): Effect.Effect<
      RepoNodesRepository,
      GraphQL.Error<typeof RepoNodes> | Cause.NoSuchElementError
    >
  }
>()("app/GitHub") {
  static readonly layer = Layer.effect(
    GitHub,
    Effect.gen(function*() {
      const client = yield* GraphQLClient.make(GitHubGraphQLGroup)

      // Null entries and non-Repository nodes fail with NoSuchElementError.
      // GitHub accepts at most 100 ids per request.
      const RepoById = GraphQLResolver.ordered(client.RepoNodes, {
        variables: (ids: ReadonlyArray<string>) => ({ ids }),
        path: ["nodes"],
        typename: "Repository"
      }).pipe(RequestResolver.batchN(100))
      return { ...client, getRepo: GraphQLResolver.request(RepoById) }
    })
  ).pipe(
    Layer.provide(GitHubAuth.layer),
    Layer.provide(GraphQLProtocol.layerHttp({ url: "https://api.github.com/graphql" })),
    Layer.provide(FetchHttpClient.layer)
  )
}

export const repoNames = Effect.fn("repoNames")(function*(ids: ReadonlyArray<string>) {
  const github = yield* GitHub
  const repos = yield* Effect.forEach(ids, github.getRepo, { concurrency: "unbounded" })
  return repos.map((repo) => repo.nameWithOwner)
})

export const program = repoNames(["R_1", "R_2"]).pipe(
  Effect.provide(GitHub.layer)
)
