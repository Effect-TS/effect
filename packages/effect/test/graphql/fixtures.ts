/**
 * Shared fixtures for the `effect/graphql` runtime tests.
 *
 * The operations below stand in for what `@effect/graphql-generator` emits for a
 * GitHub-style schema (EFF-1831, EFF-1832): one value per operation, variables
 * as struct fields, nullable result fields as `NullOr`, and a custom scalar
 * codec (`DateTime`) that applies to inputs and results alike.
 */
import { assert } from "@effect/vitest"
import { Effect, Layer, Ref, Schema, Stream } from "effect"
import { GraphQL, GraphQLGroup } from "effect/graphql"
import { GraphQLClientError } from "effect/graphql/GraphQLClientError"
import type { TransportError } from "effect/graphql/GraphQLClientError"
import * as GraphQLProtocol from "effect/graphql/GraphQLProtocol"
import * as HttpBody from "effect/http/HttpBody"
import * as HttpClient from "effect/http/HttpClient"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"

// -----------------------------------------------------------------------------
// Stand-in for generated output
// -----------------------------------------------------------------------------

export const DateTimeScalar = Schema.DateTimeUtcFromString

export const Issue = Schema.Struct({
  number: Schema.Int,
  title: Schema.String,
  createdAt: DateTimeScalar
})

export const PageInfo = Schema.Struct({
  hasNextPage: Schema.Boolean,
  endCursor: Schema.NullOr(Schema.String)
})

export const RepoIssues = GraphQL.query("RepoIssues", {
  document:
    "query RepoIssues($owner:String!,$name:String!,$after:String,$since:DateTime){repository(owner:$owner,name:$name){issues(first:2,after:$after,filterBy:{since:$since}){pageInfo{hasNextPage endCursor}nodes{number title createdAt}}}}",
  variables: {
    owner: Schema.String,
    name: Schema.String,
    after: Schema.optional(Schema.NullOr(Schema.String)),
    since: Schema.optional(Schema.NullOr(DateTimeScalar))
  },
  result: Schema.Struct({
    repository: Schema.NullOr(Schema.Struct({
      issues: Schema.NullOr(Schema.Struct({
        pageInfo: PageInfo,
        nodes: Schema.NullOr(Schema.Array(Schema.NullOr(Issue)))
      }))
    }))
  })
})

export const Viewer = GraphQL.query("Viewer", {
  document: "query Viewer{viewer{login}}",
  result: Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
})

export const AddComment = GraphQL.mutation("AddComment", {
  document:
    "mutation AddComment($subjectId:ID!,$body:String!){addComment(input:{subjectId:$subjectId,body:$body}){commentEdge{node{id}}}}",
  variables: { subjectId: Schema.String, body: Schema.String },
  result: Schema.Struct({
    addComment: Schema.NullOr(Schema.Struct({
      commentEdge: Schema.NullOr(Schema.Struct({
        node: Schema.NullOr(Schema.Struct({ id: Schema.String }))
      }))
    }))
  })
})

export const IssueUpdated = GraphQL.subscription("IssueUpdated", {
  document: "subscription IssueUpdated($id:ID!){issueUpdated(id:$id){title}}",
  variables: { id: Schema.String },
  result: Schema.Struct({ issueUpdated: Schema.Struct({ title: Schema.String }) })
})

export const IssuesGroup = GraphQLGroup.make(RepoIssues, AddComment, IssueUpdated)
export const ViewerGroup = GraphQLGroup.make(Viewer)
export const AllGroup = GraphQLGroup.merge(IssuesGroup, ViewerGroup)

// -----------------------------------------------------------------------------
// Transport doubles
// -----------------------------------------------------------------------------

/**
 * A `GraphQLProtocol` layer with scripted behaviour. Tests that exercise the
 * client (middleware, partial results, paging, subscriptions) use this instead
 * of HTTP so they stay about the client.
 */
export const protocolLayer = (service: {
  readonly execute?: (request: GraphQLProtocol.GraphQLRequest) => Effect.Effect<unknown, TransportError>
  readonly subscribe?: (request: GraphQLProtocol.GraphQLRequest) => Stream.Stream<unknown, TransportError>
}) =>
  Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
    execute: service.execute ?? (() => Effect.die("execute not scripted")),
    subscribe: service.subscribe ?? (() => Stream.die("subscribe not scripted"))
  })

/**
 * A protocol whose `execute` always answers with the same raw `ExecutionResult`
 * and records every request it received.
 */
export const executeLayer = (result: unknown) =>
  Effect.gen(function*() {
    const requests = yield* Ref.make<Array<GraphQLProtocol.GraphQLRequest>>([])
    const layer = protocolLayer({
      execute: (request) => Effect.as(Ref.update(requests, (all) => [...all, request]), result)
    })
    return { layer, requests }
  })

/**
 * An `HttpClient` that answers every request from `handler`, with the request
 * body text exposed so tests can assert on what went over the wire.
 */
export const httpClientLayer = (
  handler: (request: HttpClientRequest.HttpClientRequest, bodyText: string | undefined) => Response
) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.sync(() =>
        HttpClientResponse.fromWeb(
          request,
          handler(request, request.body instanceof HttpBody.Uint8Array ? request.body.text : undefined)
        )
      )
    )
  )

export const graphqlResponse = (body: unknown, init?: { status?: number; contentType?: string }) =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "content-type": init?.contentType ?? "application/graphql-response+json" }
  })

export const layerHttp = (
  handler: (request: HttpClientRequest.HttpClientRequest, bodyText: string | undefined) => Response
) => GraphQLProtocol.layerHttp({ url: "http://localhost/graphql" }).pipe(Layer.provide(httpClientLayer(handler)))

// -----------------------------------------------------------------------------
// Assertions
// -----------------------------------------------------------------------------

/**
 * Runs `effect`, asserts it fails with a `GraphQLClientError` whose reason has
 * `tag`, and returns that reason narrowed.
 */
export const expectReason =
  <Tag extends GraphQLClientError["reason"]["_tag"]>(tag: Tag) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.map(Effect.flip(effect), (error) => {
      assert.instanceOf(error, GraphQLClientError)
      assert.strictEqual(error.reason._tag, tag)
      return error.reason as Extract<GraphQLClientError["reason"], { _tag: Tag }>
    })
