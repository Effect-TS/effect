/**
 * GraphQL operations as plain values.
 *
 * **Details**
 *
 * An operation carries its printed document, its name, a variables Schema and
 * a result Schema. `@effect/graphql-generator` emits one per operation in a
 * `.graphql` file; they can also be written by hand. Operations are grouped
 * with `GraphQLGroup` and turned into a client with `GraphQLClient.make`.
 *
 * This module also holds the two lenient decoding helpers the generator
 * emits: {@link otherTypename} and {@link enumLiterals}.
 *
 * @stability experimental
 * @since 4.0.0
 */
import { dual } from "../Function.ts"
import { type Pipeable, pipeArguments } from "../Pipeable.ts"
import { hasProperty } from "../Predicate.ts"
import * as Schema from "../Schema.ts"
import type { GraphQLClientError } from "./GraphQLClientError.ts"
import type * as GraphQLMiddleware from "./GraphQLMiddleware.ts"

const TypeId = "~effect/graphql/GraphQL"

/**
 * The three kinds of GraphQL operation.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type Kind = "query" | "mutation" | "subscription"

/**
 * A GraphQL operation: the document to send, the operation name, the
 * variables Schema (encoded before sending) and the result Schema (decoded
 * from `data`), plus the middleware attached to this operation.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Operation<
  out K extends Kind,
  out Name extends string,
  out Variables extends Schema.Top,
  out Result extends Schema.Top,
  out Middleware = never
> extends Pipeable {
  readonly [TypeId]: typeof TypeId
  readonly kind: K
  readonly name: Name
  /** The printed document, sent as-is. It is never parsed at runtime. */
  readonly document: string
  readonly variables: Variables
  readonly result: Result
  /** Middleware attached to this operation, outermost first. */
  readonly middlewares: ReadonlyArray<GraphQLMiddleware.AnyService>
  readonly "~middleware"?: Middleware
}

/**
 * Any operation, with its type parameters erased.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export type Any = Operation<Kind, string, Schema.Top, Schema.Top, any>

/**
 * Extracts the union of middleware attached to an operation.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export type Middleware<Op> = Op extends Operation<any, any, any, any, infer M> ? M : never

/**
 * The decoded variables type of an operation, which is what a client method
 * takes.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export type Variables<Op extends Any> = Op["variables"]["Type"]

/**
 * The decoded result type of an operation.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export type Result<Op extends Any> = Op["result"]["Type"]

/**
 * The error type of a client method for an operation: `GraphQLClientError`
 * plus the errors of every attached middleware.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export type Error<Op extends Any> = GraphQLClientError | GraphQLMiddleware.Error<Middleware<Op>>

/**
 * The services a client method for an operation requires: the Schemas'
 * encoding and decoding services plus the requirements of every attached
 * middleware.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export type Services<Op extends Any> =
  | Op["variables"]["EncodingServices"]
  | Op["result"]["DecodingServices"]
  | GraphQLMiddleware.Requires<Middleware<Op>>

/**
 * The type of an operation after attaching middleware `M`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export type AddMiddleware<Op, M> = Op extends Operation<infer K, infer N, infer V, infer R, infer Old>
  ? Operation<K, N, V, R, Old | M>
  : never

/**
 * Tests whether a value is an {@link Operation}.
 *
 * @stability experimental
 * @category guards
 * @since 4.0.0
 */
export const isOperation = (u: unknown): u is Any => hasProperty(u, TypeId)

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

// The middleware type of an operation is phantom and its Schemas are erased to
// `Schema.Top` here, so the typed constructors below state their operation
// type with one assertion each.
const makeProto = (fields: Omit<Any, typeof TypeId | "pipe">): Any => Object.assign(Object.create(Proto), fields)

const makeOperation = <const K extends Kind>(kind: K) =>
<
  const Name extends string,
  Result extends Schema.Top,
  Variables extends Schema.Top | Schema.Struct.Fields = Schema.Struct<{}>
>(
  name: Name,
  options: {
    readonly document: string
    readonly variables?: Variables | undefined
    readonly result: Result
  }
): Operation<K, Name, Variables extends Schema.Struct.Fields ? Schema.Struct<Variables> : Variables, Result> =>
  makeProto({
    kind,
    name,
    document: options.document,
    variables: options.variables === undefined
      ? Schema.Struct({})
      : Schema.isSchema(options.variables)
      ? options.variables
      : Schema.Struct(options.variables as Schema.Struct.Fields),
    result: options.result,
    middlewares: []
  }) as Operation<K, Name, Variables extends Schema.Struct.Fields ? Schema.Struct<Variables> : Variables, Result>

/**
 * Defines a query. Variables are passed to the client as their decoded type
 * and encoded through the Schema, so custom scalar codecs apply to inputs as
 * well as results. `variables` takes struct fields or any Schema; leaving it
 * out means the operation has no variables.
 *
 * **Example** (A query with variables)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { GraphQL } from "effect/graphql"
 *
 * const RepoIssues = GraphQL.query("RepoIssues", {
 *   document: "query RepoIssues($owner:String!,$name:String!){repository(owner:$owner,name:$name){issues(first:10){nodes{number title}}}}",
 *   variables: { owner: Schema.String, name: Schema.String },
 *   result: Schema.Struct({
 *     repository: Schema.NullOr(Schema.Struct({
 *       issues: Schema.Struct({
 *         nodes: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.Struct({ number: Schema.Int, title: Schema.String }))))
 *       })
 *     }))
 *   })
 * })
 *
 * RepoIssues.kind // => "query"
 * RepoIssues.name // => "RepoIssues"
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const query: <
  const Name extends string,
  Result extends Schema.Top,
  Variables extends Schema.Top | Schema.Struct.Fields = Schema.Struct<{}>
>(
  name: Name,
  options: {
    readonly document: string
    readonly variables?: Variables | undefined
    readonly result: Result
  }
) => Operation<"query", Name, Variables extends Schema.Struct.Fields ? Schema.Struct<Variables> : Variables, Result> =
  makeOperation("query")

/**
 * Defines a mutation. Same shape as {@link query}.
 *
 * **Example** (A mutation)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { GraphQL } from "effect/graphql"
 *
 * const AddComment = GraphQL.mutation("AddComment", {
 *   document: "mutation AddComment($subjectId:ID!,$body:String!){addComment(input:{subjectId:$subjectId,body:$body}){clientMutationId}}",
 *   variables: { subjectId: Schema.String, body: Schema.String },
 *   result: Schema.Struct({ addComment: Schema.NullOr(Schema.Struct({ clientMutationId: Schema.NullOr(Schema.String) })) })
 * })
 *
 * AddComment.kind // => "mutation"
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const mutation: <
  const Name extends string,
  Result extends Schema.Top,
  Variables extends Schema.Top | Schema.Struct.Fields = Schema.Struct<{}>
>(
  name: Name,
  options: {
    readonly document: string
    readonly variables?: Variables | undefined
    readonly result: Result
  }
) => Operation<
  "mutation",
  Name,
  Variables extends Schema.Struct.Fields ? Schema.Struct<Variables> : Variables,
  Result
> = makeOperation("mutation")

/**
 * Defines a subscription. The client method for a subscription returns a
 * `Stream` of decoded events instead of an `Effect`.
 *
 * **Example** (A subscription)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { GraphQL } from "effect/graphql"
 *
 * const IssueUpdated = GraphQL.subscription("IssueUpdated", {
 *   document: "subscription IssueUpdated($id:ID!){issueUpdated(id:$id){title}}",
 *   variables: { id: Schema.String },
 *   result: Schema.Struct({ issueUpdated: Schema.Struct({ title: Schema.String }) })
 * })
 *
 * IssueUpdated.kind // => "subscription"
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const subscription: <
  const Name extends string,
  Result extends Schema.Top,
  Variables extends Schema.Top | Schema.Struct.Fields = Schema.Struct<{}>
>(
  name: Name,
  options: {
    readonly document: string
    readonly variables?: Variables | undefined
    readonly result: Result
  }
) => Operation<
  "subscription",
  Name,
  Variables extends Schema.Struct.Fields ? Schema.Struct<Variables> : Variables,
  Result
> = makeOperation("subscription")

/**
 * Attaches a middleware to one operation. Operation middleware runs inside
 * any group middleware; within the operation, middleware run in the order
 * they were attached.
 *
 * **Example** (Auth on a single operation)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { GraphQL, GraphQLMiddleware } from "effect/graphql"
 *
 * class Auth extends GraphQLMiddleware.Service<Auth>()("app/Auth") {}
 *
 * const Viewer = GraphQL.query("Viewer", {
 *   document: "query Viewer{viewer{login}}",
 *   result: Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
 * })
 *
 * const AuthedViewer = GraphQL.middleware(Viewer, Auth)
 *
 * AuthedViewer.middlewares.length // => 1
 * Viewer.middlewares.length // => 0
 * ```
 *
 * @stability experimental
 * @category combinators
 * @since 4.0.0
 */
export const middleware: {
  <M extends GraphQLMiddleware.AnyService>(middleware: M): <Op extends Any>(self: Op) => AddMiddleware<Op, M>
  <Op extends Any, M extends GraphQLMiddleware.AnyService>(self: Op, middleware: M): AddMiddleware<Op, M>
} = dual(
  2,
  <Op extends Any, M extends GraphQLMiddleware.AnyService>(self: Op, middleware: M): AddMiddleware<Op, M> =>
    makeProto({
      kind: self.kind,
      name: self.name,
      document: self.document,
      variables: self.variables,
      result: self.result,
      middlewares: [...self.middlewares, middleware]
    }) as AddMiddleware<Op, M>
)

/**
 * The `__typename` Schema for the "every other type" member of a generated
 * union.
 *
 * **Details**
 *
 * When a document selects `... on Issue` from a `Node`, the generator emits
 * one struct per selected type and a last struct for everything else, whose
 * `__typename` is `otherTypename<Typename.Node>()(["Issue"])`. It is typed as
 * the possible names minus the selected ones, so narrowing on `__typename`
 * works. It decodes any other string, so a type the server adds later still
 * decodes, and it rejects the selected names, so a malformed `Issue` fails
 * instead of falling through to the last struct.
 *
 * **Example** (The catch-all member of a union)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { GraphQL } from "effect/graphql"
 *
 * type Node = "Issue" | "PullRequest" | "Repository"
 *
 * const OtherNode = Schema.Struct({
 *   __typename: GraphQL.otherTypename<Node>()(["Issue"]),
 *   id: Schema.String
 * })
 *
 * Schema.decodeUnknownSync(OtherNode)({ __typename: "PullRequest", id: "1" }).__typename // => "PullRequest"
 * Schema.decodeUnknownSync(OtherNode)({ __typename: "AddedLater", id: "2" }).__typename // => "AddedLater"
 * Schema.is(OtherNode)({ __typename: "Issue", id: "3" }) // => false
 * ```
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.0
 */
export const otherTypename = <All extends string>() =>
<const Selected extends ReadonlyArray<All>>(
  selected: Selected
): Schema.Codec<Exclude<All, Selected[number]>, string> => {
  const rejected = new Set<string>(selected)
  // Type boundary: decoding is lenient by design. Any string other than the
  // selected names decodes, including names the server adds later, but the
  // type only lists the names known when the code was generated.
  return Schema.String.check(
    Schema.makeFilter(
      (name) =>
        rejected.has(name)
          ? `Expected a __typename other than ${selected.map((s) => `"${s}"`).join(", ")}`
          : undefined,
      { title: "otherTypename" }
    )
  ) as Schema.Codec<Exclude<All, Selected[number]>, string>
}

/**
 * The Schema for a GraphQL enum in a result position.
 *
 * **Details**
 *
 * It is typed as the declared literals but decodes any string, so a value the
 * server adds later does not fail the whole query. Inputs stay strict: the
 * generator uses `Schema.Literals` for enums in variables and input objects.
 *
 * **Example** (An enum that tolerates new values)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { GraphQL } from "effect/graphql"
 *
 * const IssueState = GraphQL.enumLiterals(["OPEN", "CLOSED"])
 *
 * Schema.decodeUnknownSync(IssueState)("OPEN") // => "OPEN"
 * Schema.decodeUnknownSync(IssueState)("MERGED") // => "MERGED"
 * Schema.is(IssueState)(42) // => false
 * ```
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.0
 */
export const enumLiterals = <const Literals extends ReadonlyArray<string>>(
  literals: Literals
): Schema.Codec<Literals[number], string> =>
  // Type boundary: decoding is lenient by design. Any string decodes,
  // including values the server adds later, but the type only lists the
  // values known when the code was generated.
  Schema.String.annotate({
    title: `enum(${literals.join(" | ")})`,
    description: `One of ${literals.map((l) => `"${l}"`).join(", ")}, or any string the server adds later`
  }) as Schema.Codec<Literals[number], string>
