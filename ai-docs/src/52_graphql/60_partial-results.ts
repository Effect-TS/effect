/**
 * @title Partial results
 *
 * By default any `errors` in a response fail the call. Pass
 * `{ partial: true }` to get the decoded `data` together with the errors, then
 * match each error to the alias or `nodes` index it hit.
 */
import { Effect, Option, Stream } from "effect"
import type { GraphQLClientError } from "effect/graphql"
import { GitHub } from "./20_client.ts"

// Why failing is the default: a field error turns the nearest nullable field
// into `null`, and that `null` looks exactly like a genuine one. On GitHub, a
// `NOT_FOUND` or SAML `FORBIDDEN` on one alias would otherwise read as "no
// such repository". With `partial: true` you get the errors next to the data,
// so you can tell the two apart.
//
// Under `partial: true`:
// - `errors` is always present and may be empty.
// - `data: null` with errors still fails with a `ResponseError`, because
//   there is nothing partial to return.
// - `data` that doesn't decode still fails with a `DecodeError`.
// - It works for queries and mutations. Subscriptions, `GraphQLClient.pages`
//   and `GraphQLClient.items` don't accept it.

// An error's `path` points at the field that errored, which can be below the
// field that became `null`. Match on a prefix of the path, not the whole path.
const errorsUnder = (
  errors: ReadonlyArray<GraphQLClientError.GraphQLError>,
  ...prefix: ReadonlyArray<string | number>
) => errors.filter((error) => prefix.every((key, i) => error.path?.[i] === key))

// Aliases: `path[0]` is the response key, which is the alias when the
// document uses one (see `query EffectRepositories` in
// `fixtures/github/pullRequests.graphql`).
export const effectRepositories = Effect.gen(function*() {
  const github = yield* GitHub
  // A document without variables takes `undefined` before the options.
  const { data, errors } = yield* github.EffectRepositories(undefined, { partial: true })
  return (["effect", "website"] as const).map((alias) => {
    const repository = data[alias]
    if (repository !== null) return { alias, status: "found", name: repository.nameWithOwner } as const
    const hit = errorsUnder(errors, alias)
    return hit.length > 0
      // `null` because of an error, e.g. `extensions.type === "NOT_FOUND"`
      ? { alias, status: "failed", reason: hit.map((error) => error.message).join("; ") } as const
      // A genuine `null`
      : { alias, status: "missing" } as const
  })
})

// `nodes(ids:)`: the item index is `path[1]`, so an ID GitHub can't resolve
// comes back as a `null` entry with an error at `["nodes", i]`.
export const pullRequestsById = Effect.fn("pullRequestsById")(function*(ids: ReadonlyArray<string>) {
  const github = yield* GitHub
  const { data, errors } = yield* github.PullRequestsById({ ids }, { partial: true })
  return data.nodes.map((node, i) => {
    if (node?.__typename === "PullRequest") return { id: ids[i], pullRequest: node }
    // `null`, or a node of another type (`__typename` narrows the union)
    return { id: ids[i], pullRequest: null, errors: errorsUnder(errors, "nodes", i) }
  })
})

// Tolerant paging: `pages` and `items` fail on the first page with errors.
// To keep going, page by hand with `Stream.paginate` over the partial method,
// and decide per page what to do with its errors.
export const issuesTolerantly = (owner: string, name: string) =>
  Stream.unwrap(Effect.gen(function*() {
    const github = yield* GitHub
    return Stream.paginate(undefined as string | undefined, (after) =>
      github.RepoIssues({ owner, name, after }, { partial: true }).pipe(
        Effect.tap(({ errors }) =>
          errors.length === 0 ? Effect.void : Effect.logWarning("Some issues failed to load", errors)
        ),
        Effect.map(({ data }) => {
          const connection = data.repository?.issues
          const nodes = (connection?.nodes ?? []).filter((issue) =>
            issue !== null
          )
          const next = connection?.pageInfo.hasNextPage === true ? connection.pageInfo.endCursor : null
          // Stop on the last page, and on a cursor that doesn't advance, which
          // would otherwise loop forever.
          return [nodes, next === null || next === after ? Option.none() : Option.some(next)] as const
        })
      ))
  }))
