/**
 * @title Batching requests
 *
 * `effect/graphql` doesn't merge operations into one document at runtime. On
 * GitHub, run single queries concurrently, fetch up to 100 nodes by ID with
 * `nodes(ids:)`, or write the aliased document yourself over the raw
 * `GraphQLProtocol`.
 */
import { Array, Config, Context, Effect, Layer, Predicate, Redacted, Schema, Stream } from "effect"
import { GraphQLClient, GraphQLClientError, GraphQLProtocol } from "effect/graphql"
import { FetchHttpClient } from "effect/http"
import { GitHub } from "./20_client.ts"

// Merging operations means rewriting documents with a dynamic alias per item,
// which needs a GraphQL parser at runtime. The parser lives in the generator
// and documents stay static, so pick one of the options below instead.

// 1. Concurrent single queries. The simplest option: every item keeps its own
//    typed call, errors and retries. The cost is GitHub's rate limit: each
//    query costs about one point, so N queries cost about N points, where one
//    aliased document for the same N repositories costs about one. Keep the
//    concurrency modest; GitHub also limits concurrent requests.
export const openIssueCounts = Effect.fn("openIssueCounts")(function*(
  repositories: ReadonlyArray<{ readonly owner: string; readonly name: string }>
) {
  const github = yield* GitHub
  return yield* Effect.forEach(
    repositories,
    ({ name, owner }) =>
      github.RepoIssues({ owner, name, states: ["OPEN"] }).pipe(
        Effect.map(({ repository }) => ({ owner, name, firstPage: repository?.issues.nodes?.length ?? 0 }))
      ),
    { concurrency: 4 }
  )
})

// 2. `nodes(ids:)` when an earlier query returned node IDs. One request
//    fetches up to 100 IDs, with `... on PullRequest` selecting the fields
//    (see `query PullRequestsById` in `fixtures/github/pullRequests.graphql`).
//    One missing ID would fail the whole batch, so use `partial: true` and
//    match errors to items with `path[1]` (see the partial results example).
export const openPullRequests = Effect.fn("openPullRequests")(function*(owner: string, name: string) {
  const github = yield* GitHub
  const ids = yield* GraphQLClient.items(github.OpenPullRequestIds, {
    variables: { owner, name },
    connection: (result) => result.repository?.pullRequests
  }).pipe(
    Stream.filter(Predicate.isNotNull),
    Stream.map((node) => node.id),
    Stream.runCollect
  )
  const batches = yield* Effect.forEach(
    Array.chunksOf(ids, 100),
    (ids) => github.PullRequestsById({ ids }, { partial: true }),
    { concurrency: 2 }
  )
  return batches.flatMap(({ data }) => data.nodes.filter((node) => node?.__typename === "PullRequest"))
})

// 3. The escape hatch: build the aliased document yourself and send it over
//    the raw `GraphQLProtocol`, with its own result Schema. The protocol takes
//    an encoded request and returns the raw body; there are no middleware,
//    so the service adds its own auth header. Pass inputs as variables, never
//    by interpolating them into the document.
const Repository = Schema.NullOr(Schema.Struct({ nameWithOwner: Schema.String, stargazerCount: Schema.Int }))

export class RepositoryBatch extends Context.Service<RepositoryBatch, {
  readonly lookup: (
    repositories: ReadonlyArray<{ readonly owner: string; readonly name: string }>
  ) => Effect.Effect<
    {
      readonly repositories: ReadonlyArray<typeof Repository.Type>
      readonly errors: ReadonlyArray<GraphQLClientError.GraphQLError>
    },
    GraphQLClientError.GraphQLClientError
  >
}>()("app/RepositoryBatch") {
  static readonly layer = Layer.effect(
    RepositoryBatch,
    Effect.gen(function*() {
      const protocol = yield* GraphQLProtocol.GraphQLProtocol
      const token = yield* Config.Redacted("GITHUB_TOKEN")

      const lookup = Effect.fn("RepositoryBatch.lookup")(function*(
        repositories: ReadonlyArray<{ readonly owner: string; readonly name: string }>
      ) {
        const fail = (reason: GraphQLClientError.Reason) =>
          new GraphQLClientError.GraphQLClientError({ operation: "RepositoryBatch", reason })
        // One alias and two variables per repository: `r0: repository(...)`.
        const definitions = repositories.map((_, i) => `$o${i}:String!,$n${i}:String!`).join(",")
        const fields = repositories.map((_, i) =>
          `r${i}:repository(owner:$o${i},name:$n${i}){nameWithOwner stargazerCount}`
        )
          .join(" ")
        const variables = Object.fromEntries(
          repositories.flatMap(({ name, owner }, i) => [[`o${i}`, owner], [`n${i}`, name]])
        )

        const body = yield* protocol.execute({
          query: `query RepositoryBatch(${definitions}){${fields}}`,
          operationName: "RepositoryBatch",
          variables,
          headers: { authorization: `Bearer ${Redacted.value(token)}` }
        }).pipe(Effect.mapError(fail))

        // Decode the GraphQL envelope, then `data` with this document's Schema.
        const result = yield* Schema.decodeUnknownEffect(GraphQLProtocol.ExecutionResult)(body).pipe(
          Effect.mapError((error) => fail(new GraphQLClientError.DecodeError({ description: error.message })))
        )
        const errors = result.errors ?? []
        if (result.data == null) {
          return yield* Array.isReadonlyArrayNonEmpty(errors)
            ? Effect.fail(fail(new GraphQLClientError.ResponseError({ errors })))
            : Effect.fail(fail(new GraphQLClientError.DecodeError({ description: "data is missing" })))
        }
        const data = yield* Schema.decodeUnknownEffect(Schema.Record(Schema.String, Repository))(result.data).pipe(
          Effect.mapError((error) => fail(new GraphQLClientError.DecodeError({ description: error.message })))
        )
        // Return the errors with the data, as `partial: true` does. `path[0]`
        // is the alias, so `r3` is the fourth repository.
        return { repositories: repositories.map((_, i) => data[`r${i}`] ?? null), errors }
      })

      return RepositoryBatch.of({ lookup })
    })
  ).pipe(
    Layer.provide(GraphQLProtocol.layerHttp({ url: "https://api.github.com/graphql" })),
    Layer.provide(FetchHttpClient.layer)
  )
}
