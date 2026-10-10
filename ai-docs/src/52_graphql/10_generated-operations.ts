/**
 * @title Generated operations and groups
 *
 * Run `graphqlgen` over your `.graphql` documents to get one operation value
 * per definition and one group per file. Merge the groups into one client,
 * use the generated types in your own code, and write an operation by hand
 * when there is no document for it.
 */
import { Schema } from "effect"
import { GraphQL, GraphQLGroup } from "effect/graphql"
// `fixtures/github/issues.graphql` declares `query RepoIssues`,
// `query RepoIssueEdges`, `mutation AddComment` and `fragment IssueSummary`.
// Running `graphqlgen` with `fixtures/graphql.config.ts` writes
// `issues.graphql.ts` next to it. That module exports:
//
// - `RepoIssues`, `RepoIssueEdges` and `AddComment`: operation values that
//   carry the printed document, a variables Schema and a result Schema
// - `RepoIssues.Variables` and `RepoIssues.Result`: the decoded types
// - `IssueSummary`: the fragment's Schema, reused by every operation that
//   spreads it
// - `IssuesGroup`: every operation in the file
//
// Scalars, enums and input objects that the documents reach are written once
// to a shared module next to the schema (`fixtures/github/github.graphql.ts`).
// Commit the generated files and exclude `*.graphql.ts` from lint and format.
import { IssuesGroup, type IssueSummary, type RepoIssues } from "./fixtures/github/issues.graphql.ts"
import { PullRequestsGroup } from "./fixtures/github/pullRequests.graphql.ts"
import { ViewerGroup } from "./fixtures/github/viewer.graphql.ts"

// A hand-written operation has the same shape as a generated one. Use it for
// a document the generator doesn't see, such as one built for a single call
// site. The document is sent as written and is never parsed at runtime, so
// keep it in sync with the Schemas yourself.
export const RateLimit = GraphQL.query("RateLimit", {
  document: "query RateLimit{rateLimit{cost remaining resetAt}}",
  result: Schema.Struct({
    rateLimit: Schema.NullOr(Schema.Struct({
      cost: Schema.Int,
      remaining: Schema.Int,
      resetAt: Schema.DateTimeUtcFromString
    }))
  })
})

// Merge the per-file groups into the set of operations one client exposes.
// Each operation becomes a method named after it, so names must be unique
// across the merged groups (the generator already rejects duplicates across
// the files of one config).
export const GitHubOperations = GraphQLGroup.merge(
  IssuesGroup,
  PullRequestsGroup,
  ViewerGroup,
  GraphQLGroup.make(RateLimit)
)

// The generated namespaces give you the decoded types for signatures.
// `IssueSummary` is an opaque Schema class, so its type is the class itself.
export const issueLine = (issue: IssueSummary): string =>
  `#${issue.number} ${issue.title} (${issue.state}, opened ${issue.createdAt.toString()})`

// Results mirror GraphQL nullability: a nullable field is `T | null`, and a
// nullable list of nullable items is `ReadonlyArray<T | null> | null`.
export const issueLines = (result: RepoIssues.Result): ReadonlyArray<string> =>
  (result.repository?.issues.nodes ?? []).flatMap((issue) => issue === null ? [] : [issueLine(issue)])
