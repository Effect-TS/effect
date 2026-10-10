import { Context, type Effect, hole, type Schedule, Schema, type Stream } from "effect"
import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLMiddleware, type GraphQLProtocol } from "effect/graphql"
import type { GraphQLClientError, GraphQLError } from "effect/graphql/GraphQLClientError"
import { describe, expect, it } from "tstyche"

class CurrentUser extends Context.Service<CurrentUser, { readonly id: string }>()("CurrentUser") {}
class TokenExpired extends Schema.TaggedError<TokenExpired>()("TokenExpired", { user: Schema.String }) {}

class Auth extends GraphQLMiddleware.Service<Auth, { requires: CurrentUser; error: TokenExpired }>()("Auth") {}
class Log extends GraphQLMiddleware.Service<Log>()("Log") {}

const Issue = Schema.Struct({ number: Schema.Int, title: Schema.String })
const PageInfo = Schema.Struct({ hasNextPage: Schema.Boolean, endCursor: Schema.NullOr(Schema.String) })

const IssuesConnection = Schema.Struct({
  pageInfo: PageInfo,
  nodes: Schema.NullOr(Schema.Array(Schema.NullOr(Issue)))
})
const RepoIssuesResult = Schema.Struct({
  repository: Schema.NullOr(Schema.Struct({ issues: Schema.NullOr(IssuesConnection) }))
})
type RepoIssuesResult = typeof RepoIssuesResult.Type
type IssuesConnection = typeof IssuesConnection.Type

const ViewerResult = Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
type ViewerResult = typeof ViewerResult.Type

const Viewer = GraphQL.query("Viewer", { document: "", result: ViewerResult })

const RepoIssues = GraphQL.query("RepoIssues", {
  document: "",
  variables: {
    owner: Schema.String,
    name: Schema.String,
    after: Schema.optional(Schema.NullOr(Schema.String))
  },
  result: RepoIssuesResult
})

const IssueUpdatedResult = Schema.Struct({ issueUpdated: Schema.Struct({ title: Schema.String }) })
const IssueUpdated = GraphQL.subscription("IssueUpdated", {
  document: "",
  variables: { id: Schema.String },
  result: IssueUpdatedResult
})

// Paging counter-examples: documents the helpers must reject.
const NoPageInfoResult = Schema.Struct({
  repository: Schema.NullOr(Schema.Struct({ issues: Schema.Struct({ nodes: Schema.Array(Issue) }) }))
})
const NoPageInfo = GraphQL.query("NoPageInfo", {
  document: "",
  variables: { after: Schema.optional(Schema.NullOr(Schema.String)) },
  result: NoPageInfoResult
})

const NoAfter = GraphQL.query("NoAfter", {
  document: "",
  variables: { owner: Schema.String },
  result: RepoIssuesResult
})

const EdgesOnlyResult = Schema.Struct({
  issues: Schema.Struct({ pageInfo: PageInfo, edges: Schema.Array(Schema.Struct({ node: Issue })) })
})
const EdgesOnly = GraphQL.query("EdgesOnly", {
  document: "",
  variables: { after: Schema.optional(Schema.NullOr(Schema.String)) },
  result: EdgesOnlyResult
})

// Cursor variables the helpers must reject: the helper omits `after` on the
// first page and sends the previous `endCursor` (a string) afterwards.
const RequiredAfter = GraphQL.query("RequiredAfter", {
  document: "",
  variables: { after: Schema.String },
  result: RepoIssuesResult
})
const NumberAfter = GraphQL.query("NumberAfter", {
  document: "",
  variables: { after: Schema.optional(Schema.NullOr(Schema.Number)) },
  result: RepoIssuesResult
})
// A non-null `$after: String!` with a default becomes `after?: string`, which
// the helper can drive, so it is accepted.
const StringOnlyAfter = GraphQL.query("StringOnlyAfter", {
  document: "",
  variables: { after: Schema.optional(Schema.String) },
  result: RepoIssuesResult
})

const group = GraphQLGroup.merge(
  GraphQLGroup.make(GraphQL.middleware(RepoIssues, Auth), IssueUpdated),
  GraphQLGroup.make(Viewer, NoPageInfo, NoAfter, EdgesOnly, RequiredAfter, NumberAfter, StringOnlyAfter)
).middleware(Log)

const make = GraphQLClient.make(group)
type Client = Effect.Success<typeof make>
const client = hole<Client>()

const variables = { owner: "Effect-TS", name: "effect" }
const connection = (r: RepoIssuesResult) => r.repository?.issues

describe("GraphQLClient.make", () => {
  it("requires the protocol and every attached middleware tag", () => {
    expect<Effect.Services<typeof make>>().type.toBe<GraphQLProtocol.GraphQLProtocol | Auth | Log>()
    expect<Effect.Error<typeof make>>().type.toBe<never>()
  })

  it("accepts a subscriptionRetry schedule", () => {
    expect(GraphQLClient.make).type.toBeCallableWith(group, { subscriptionRetry: hole<Schedule.Schedule<unknown>>() })
  })
})

describe("GraphQLClient methods", () => {
  it("a query without variables or middleware effects returns Effect<Result, GraphQLClientError>", () => {
    expect(client.Viewer()).type.toBe<Effect.Effect<ViewerResult, GraphQLClientError>>()
    expect(client.Viewer).type.toBeCallableWith(undefined, { headers: { "x-request-id": "abc" } })
  })

  it("middleware requires and error appear only on the operations it is attached to", () => {
    expect(client.RepoIssues(variables)).type.toBe<
      Effect.Effect<RepoIssuesResult, GraphQLClientError | TokenExpired, CurrentUser>
    >()
    expect<Effect.Error<ReturnType<typeof client.Viewer>>>().type.toBe<GraphQLClientError>()
    expect<Effect.Services<ReturnType<typeof client.Viewer>>>().type.toBe<never>()
  })

  it("a subscription returns a Stream", () => {
    expect(client.IssueUpdated({ id: "I_1" })).type.toBe<
      Stream.Stream<typeof IssueUpdatedResult.Type, GraphQLClientError>
    >()
  })

  it("the context option removes the services it provides from the requirements", () => {
    expect(client.RepoIssues(variables, { context: Context.make(CurrentUser, { id: "tim" }) })).type.toBe<
      Effect.Effect<RepoIssuesResult, GraphQLClientError | TokenExpired>
    >()
  })

  it("partial: true returns { data, errors } on queries and mutations", () => {
    expect(client.RepoIssues(variables, { partial: true })).type.toBe<
      Effect.Effect<
        { readonly data: RepoIssuesResult; readonly errors: ReadonlyArray<GraphQLError> },
        GraphQLClientError | TokenExpired,
        CurrentUser
      >
    >()
    expect(client.Viewer(undefined, { partial: true })).type.toBe<
      Effect.Effect<{ readonly data: ViewerResult; readonly errors: ReadonlyArray<GraphQLError> }, GraphQLClientError>
    >()
    expect(client.Viewer(undefined, { partial: false })).type.toBe<Effect.Effect<ViewerResult, GraphQLClientError>>()
  })

  it("rejects missing required variables", () => {
    expect(client.RepoIssues).type.not.toBeCallableWith()
    expect(client.RepoIssues).type.not.toBeCallableWith({ owner: "Effect-TS" })
    expect(client.IssueUpdated).type.not.toBeCallableWith()
  })

  it("rejects an operation that is not in the group", () => {
    expect(client).type.not.toHaveProperty("Nope")
  })

  it("rejects partial: boolean", () => {
    expect(client.RepoIssues).type.not.toBeCallableWith(variables, { partial: hole<boolean>() })
  })

  it("rejects partial on a subscription method", () => {
    expect(client.IssueUpdated).type.not.toBeCallableWith({ id: "I_1" }, { partial: true })
  })
})

describe("GraphQLClient.pages / items", () => {
  it("pages emits the connection with the method's error and requirements", () => {
    expect(GraphQLClient.pages(client.RepoIssues, { variables, connection })).type.toBe<
      Stream.Stream<IssuesConnection, GraphQLClientError | TokenExpired, CurrentUser>
    >()
  })

  it("items emits each node, null entries included", () => {
    expect(GraphQLClient.items(client.RepoIssues, { variables, connection })).type.toBe<
      Stream.Stream<typeof Issue.Type | null, GraphQLClientError | TokenExpired, CurrentUser>
    >()
  })

  it("forwards headers and context but rejects partial in options", () => {
    expect(GraphQLClient.pages).type.toBeCallableWith(client.RepoIssues, {
      variables,
      connection,
      options: { headers: { "x-a": "b" } }
    })
    expect(GraphQLClient.pages).type.not.toBeCallableWith(client.RepoIssues, {
      variables,
      connection,
      options: { partial: true }
    })
    expect(GraphQLClient.items).type.not.toBeCallableWith(client.RepoIssues, {
      variables,
      connection,
      options: { partial: true }
    })
  })

  it("variables leave out after", () => {
    expect(GraphQLClient.pages).type.not.toBeCallableWith(client.RepoIssues, {
      variables: { owner: "Effect-TS", name: "effect", after: "c1" },
      connection
    })
  })

  it("rejects a required or non-string after variable", () => {
    expect(GraphQLClient.pages).type.not.toBeCallableWith(client.RequiredAfter, { variables: {}, connection })
    expect(GraphQLClient.items).type.not.toBeCallableWith(client.RequiredAfter, { variables: {}, connection })
    expect(GraphQLClient.pages).type.not.toBeCallableWith(client.NumberAfter, { variables: {}, connection })
    expect(GraphQLClient.items).type.not.toBeCallableWith(client.NumberAfter, { variables: {}, connection })
  })

  it("accepts an optional string-only after variable", () => {
    expect(GraphQLClient.pages).type.toBeCallableWith(client.StringOnlyAfter, { variables: {}, connection })
    expect(GraphQLClient.items).type.toBeCallableWith(client.StringOnlyAfter, { variables: {}, connection })
  })

  it("rejects a getter whose connection has no pageInfo", () => {
    expect(GraphQLClient.pages).type.not.toBeCallableWith(client.NoPageInfo, {
      variables: {},
      connection: (r: typeof NoPageInfoResult.Type) => r.repository?.issues
    })
  })

  it("rejects a method whose variables have no after", () => {
    expect(GraphQLClient.pages).type.not.toBeCallableWith(client.NoAfter, {
      variables: { owner: "Effect-TS" },
      connection
    })
  })

  it("items rejects a connection without nodes, pages accepts it", () => {
    expect(GraphQLClient.pages).type.toBeCallableWith(client.EdgesOnly, {
      variables: {},
      connection: (r: typeof EdgesOnlyResult.Type) => r.issues
    })
    expect(GraphQLClient.items).type.not.toBeCallableWith(client.EdgesOnly, {
      variables: {},
      connection: (r: typeof EdgesOnlyResult.Type) => r.issues
    })
  })
})
