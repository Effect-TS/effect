/**
 * @title Paging through cursor connections
 *
 * `GraphQLClient.items` and `GraphQLClient.pages` page forward through a
 * connection by driving the document's `$after` variable, one request at a
 * time and only as the stream is pulled.
 */
import { Context, Effect, Layer, Predicate, Stream } from "effect"
import { GraphQLClient, type GraphQLClientError } from "effect/graphql"
import { GitHub } from "./20_client.ts"
import type { IssueSummary } from "./fixtures/github/issues.graphql.ts"

// The convention, checked by the types: the document declares a nullable
// `$after: String`, passes it to the connection it pages, and selects
// `pageInfo { hasNextPage endCursor }` there. `items` also needs `nodes`.
// Leaving out `$after`, `pageInfo` or (for `items`) `nodes` is a compile
// error. See `fixtures/github/issues.graphql`.
//
// The stream ends after a page with `hasNextPage: false`. A `null` connection
// on the first page (an unknown repository) gives an empty stream. A `null`
// connection on a later page, or a cursor that is `null` or doesn't advance
// while `hasNextPage` is `true`, fails with a `PaginationError`. A page with
// `errors` fails with a `ResponseError`; the options don't accept `partial`.

export class Issues extends Context.Service<Issues, {
  readonly open: (owner: string, name: string) => Stream.Stream<IssueSummary, GraphQLClientError.GraphQLClientError>
  readonly all: (owner: string, name: string) => Stream.Stream<IssueSummary, GraphQLClientError.GraphQLClientError>
}>()("app/Issues") {
  static readonly layer = Layer.effect(
    Issues,
    Effect.gen(function*() {
      const github = yield* GitHub

      // `items` emits every entry of `nodes`, typed as the document selects
      // it. GitHub's `nodes` is a nullable list of nullable items, so entries
      // can be `null`; nothing is dropped unless you filter it.
      const open = (owner: string, name: string) =>
        GraphQLClient.items(github.RepoIssues, {
          // Every variable except `after`, which the helper supplies.
          variables: { owner, name, states: ["OPEN"] },
          // Where the connection is in the result. Optional chaining is fine:
          // `null` and `undefined` are handled as described above.
          connection: (result) => result.repository?.issues
        }).pipe(Stream.filter(Predicate.isNotNull))

      // A connection that selects only `edges` is paged with `pages`, which
      // emits each page's connection, plus `Stream.flatMap` over its edges.
      const all = (owner: string, name: string) =>
        GraphQLClient.pages(github.RepoIssueEdges, {
          variables: { owner, name },
          connection: (result) => result.repository?.issues
        }).pipe(
          Stream.flatMap((connection) => Stream.fromArray(connection.edges ?? [])),
          Stream.map((edge) => edge?.node ?? null),
          Stream.filter(Predicate.isNotNull)
        )

      return Issues.of({ open, all })
    })
  )
}

export const firstOpenIssues = Effect.gen(function*() {
  const issues = yield* Issues
  // Each page is a normal method call, so the auth middleware runs on every
  // page. `Stream.take` stops fetching once it has enough: no page is
  // requested after the one that supplies the 60th issue.
  return yield* issues.open("Effect-TS", "effect").pipe(
    Stream.take(60),
    Stream.map((issue) => `#${issue.number} ${issue.title}`),
    Stream.runCollect
  )
}).pipe(Effect.provide(Issues.layer.pipe(Layer.provide(GitHub.layer))))
