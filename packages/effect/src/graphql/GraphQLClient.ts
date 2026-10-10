/**
 * A typed GraphQL client built from a `GraphQLGroup`.
 *
 * **Details**
 *
 * `make(group)` returns an object with one method per operation. Queries and
 * mutations return an `Effect`, subscriptions return a `Stream`. The client
 * encodes variables, runs the middleware chain, sends the request through the
 * `GraphQLProtocol` in context, and decodes `data` with the result Schema.
 *
 * `pages` and `items` page through cursor connections with a client method.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Schedule from "../Schedule.ts"
import * as Schema from "../Schema.ts"
import * as Stream from "../Stream.ts"
import type * as GraphQL from "./GraphQL.ts"
import {
  DecodeError,
  EncodeError,
  GraphQLClientError,
  type GraphQLError,
  isGraphQLClientError,
  PaginationError,
  type Reason,
  ResponseError
} from "./GraphQLClientError.ts"
import type { GraphQLGroup } from "./GraphQLGroup.ts"
import type * as GraphQLMiddleware from "./GraphQLMiddleware.ts"
import { ExecutionResult, GraphQLProtocol, type GraphQLRequest } from "./GraphQLProtocol.ts"

/**
 * What a query or mutation returns when called with `{ partial: true }`:
 * the decoded `data` together with the response `errors`, which may be empty.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface PartialResult<A> {
  readonly data: A
  readonly errors: ReadonlyArray<GraphQLError>
}

/**
 * Per-call options shared by every method. `headers` are sent by the HTTP
 * transport and visible to middleware. `context` provides services for this
 * call only, and removes them from the method's requirements.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface CallOptions<R = never> {
  readonly headers?: Readonly<Record<string, string>> | undefined
  readonly context?: Context.Context<R> | undefined
}

/**
 * The options of a query or mutation call that returns a {@link PartialResult}.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface PartialCallOptions<R = never> extends CallOptions<R> {
  readonly partial: true
}

/**
 * The options of a query or mutation call that fails on any `errors`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface StrictCallOptions<R = never> extends CallOptions<R> {
  readonly partial?: false | undefined
}

type Args<Variables, Options> = {} extends Variables ? [variables?: Variables, options?: Options]
  : [variables: Variables, options?: Options]

type ArgsWithOptions<Variables, Options> = {} extends Variables ? [variables: Variables | undefined, options: Options]
  : [variables: Variables, options: Options]

/**
 * The client method for a query or mutation.
 *
 * **Details**
 *
 * Called as `(variables?, options?)`. Without `partial`, or with
 * `partial: false`, it returns the decoded result and fails with a
 * `ResponseError` on any `errors`. With `partial: true` it returns
 * `{ data, errors }`. The two overloads are explicit so that a `boolean`
 * `partial` does not compile.
 *
 * An operation without variables is called as `client.Viewer()` or, with
 * options, `client.Viewer(undefined, { headers })`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface OperationMethod<Op extends GraphQL.Any> {
  /** The operation this method runs. */
  readonly operation: Op
  <R2 = never>(
    ...args: ArgsWithOptions<GraphQL.Variables<Op>, PartialCallOptions<R2>>
  ): Effect.Effect<PartialResult<GraphQL.Result<Op>>, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>>
  <R2 = never>(
    ...args: Args<GraphQL.Variables<Op>, StrictCallOptions<R2>>
  ): Effect.Effect<GraphQL.Result<Op>, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>>
}

/**
 * The client method for a subscription. It returns a `Stream` of decoded
 * events; an event with `errors` fails the stream with a `ResponseError`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SubscriptionMethod<Op extends GraphQL.Any> {
  /** The operation this method runs. */
  readonly operation: Op
  <R2 = never>(
    ...args: Args<GraphQL.Variables<Op>, CallOptions<R2>>
  ): Stream.Stream<GraphQL.Result<Op>, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>>
}

/**
 * The client method type for an operation, by its kind.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type Method<Op extends GraphQL.Any> = Op["kind"] extends "subscription" ? SubscriptionMethod<Op>
  : OperationMethod<Op>

/**
 * A client: one method per operation, keyed by operation name.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type GraphQLClient<Ops extends GraphQL.Any> = {
  readonly [Op in Ops as Op["name"]]: Method<Op>
}

/**
 * Options for {@link make}.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Options {
  /**
   * How a subscription is retried after the transport fails it with a
   * retryable `TransportError`. Defaults to {@link defaultSubscriptionRetry}.
   * Fatal errors are never retried, whatever the schedule.
   */
  readonly subscriptionRetry?: Schedule.Schedule<unknown, GraphQLClientError> | undefined
}

/**
 * The default subscription retry schedule: exponential from 500 milliseconds
 * with factor 1.5, capped at 5 seconds, and never shorter than the server's
 * `retryAfter`.
 *
 * @stability experimental
 * @category constants
 * @since 4.0.0
 */
export const defaultSubscriptionRetry: Schedule.Schedule<Duration.Duration, GraphQLClientError> = Schedule.exponential(
  "500 millis",
  1.5
).pipe(
  Schedule.setInputType<GraphQLClientError>(),
  Schedule.modifyDelay(({ duration, input }) => {
    const capped = Duration.toMillis(duration) > 5_000 ? Duration.seconds(5) : duration
    const retryAfter = input.retryAfter
    return Effect.succeed(
      retryAfter !== undefined && Duration.toMillis(retryAfter) > Duration.toMillis(capped) ? retryAfter : capped
    )
  })
)

/**
 * Builds a client from a group. The effect requires the `GraphQLProtocol` and
 * every middleware tag attached to the group or its operations, so a missing
 * middleware layer is a type error where the client is built.
 *
 * **Details**
 *
 * Group middleware runs outside operation middleware. Within each level,
 * middleware run in the order attached.
 *
 * **Example** (A client as a service)
 *
 * ```ts import.meta.vitest
 * import { Context, Effect, Layer, Schema, Stream } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol } from "effect/graphql"
 *
 * // What the generator emits for viewer.graphql
 * const Viewer = GraphQL.query("Viewer", {
 *   document: "query Viewer{viewer{login}}",
 *   result: Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
 * })
 * const ViewerGroup = GraphQLGroup.make(Viewer)
 *
 * class GitHub extends Context.Service<GitHub>()("app/GitHub", {
 *   make: GraphQLClient.make(ViewerGroup)
 * }) {}
 *
 * // A scripted transport; use GraphQLProtocol.layerHttp({ url }) for a real server
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: () => Effect.succeed({ data: { viewer: { login: "tim" } } }),
 *   subscribe: () => Stream.empty
 * })
 *
 * const program = GitHub.use((github) => github.Viewer()).pipe(
 *   Effect.provide(Layer.effect(GitHub, GitHub.make).pipe(Layer.provide(Scripted)))
 * )
 *
 * await Effect.runPromise(program) // => { viewer: { login: "tim" } }
 * ```
 *
 * **Example** (Partial results)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema, Stream } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol } from "effect/graphql"
 *
 * const Repos = GraphQL.query("Repos", {
 *   document: "query Repos{a:repository(owner:\"x\",name:\"a\"){name} b:repository(owner:\"x\",name:\"b\"){name}}",
 *   result: Schema.Struct({
 *     a: Schema.NullOr(Schema.Struct({ name: Schema.String })),
 *     b: Schema.NullOr(Schema.Struct({ name: Schema.String }))
 *   })
 * })
 *
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: () =>
 *     Effect.succeed({
 *       data: { a: { name: "a" }, b: null },
 *       errors: [{ message: "Could not resolve to a Repository", path: ["b"] }]
 *     }),
 *   subscribe: () => Stream.empty
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(Repos))
 *   // The default call fails with a ResponseError because `errors` is non-empty
 *   const failed = yield* Effect.flip(client.Repos())
 *   // With partial: true the decoded data comes back together with the errors
 *   const { data, errors } = yield* client.Repos(undefined, { partial: true })
 *   return [failed.reason._tag, data.a?.name, errors[0].path?.[0]]
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Scripted))) // => ["ResponseError", "a", "b"]
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = <Ops extends GraphQL.Any>(
  group: GraphQLGroup<Ops>,
  options?: Options | undefined
): Effect.Effect<
  GraphQLClient<Ops>,
  never,
  GraphQLProtocol | GraphQLMiddleware.Identifier<GraphQL.Middleware<Ops>>
> =>
  Effect.gen(function*() {
    const protocol = yield* GraphQLProtocol
    const context = yield* Effect.context<never>()
    const retryPolicy = Schedule.while(
      (options?.subscriptionRetry ?? defaultSubscriptionRetry) as Schedule.Schedule<unknown, unknown>,
      ({ input }) => isGraphQLClientError(input) && input.isRetryable
    )
    const client: Record<string, unknown> = {}
    for (const operation of group.operations) {
      const chain = [...group.middlewares, ...operation.middlewares].map((tag) =>
        Context.getUnsafe(context, tag) as GraphQLMiddleware.Implementation<any, any>
      )
      client[operation.name] = makeMethod(operation, chain, protocol, retryPolicy)
    }
    return client as GraphQLClient<Ops>
  })

const decodeExecutionResult = Schema.decodeUnknownEffect(ExecutionResult)

const makeMethod = (
  operation: GraphQL.Any,
  chain: ReadonlyArray<GraphQLMiddleware.Implementation<any, any>>,
  protocol: GraphQLProtocol["Service"],
  retryPolicy: Schedule.Schedule<unknown, unknown>
) => {
  const fail = (reason: Reason) => new GraphQLClientError({ operation: operation.name, reason })
  const schemaFail = (make: (description: string) => Reason) => (error: Schema.SchemaError) =>
    Effect.fail(fail(make(error.message)))
  const encodeVariables = Schema.encodeUnknownEffect(operation.variables)
  const decodeResult = Schema.decodeUnknownEffect(operation.result)

  const notGraphQL = schemaFail((description) =>
    new DecodeError({ description: `Not a GraphQL response: ${description}` })
  )

  const buildRequest = (
    variables: unknown,
    options: CallOptions<any> | undefined
  ): Effect.Effect<GraphQLRequest, GraphQLClientError, any> =>
    encodeVariables(variables ?? {}).pipe(
      Effect.catch(schemaFail((description) => new EncodeError({ description }))),
      Effect.map((encoded) => ({
        query: operation.document,
        operationName: operation.name,
        variables: encoded,
        headers: options?.headers ?? {}
      }))
    )

  const execute = (index: number, request: GraphQLRequest): Effect.Effect<ExecutionResult, any, any> =>
    index === chain.length
      ? protocol.execute(request).pipe(
        Effect.mapError(fail),
        Effect.flatMap((body) => Effect.catch(decodeExecutionResult(body), notGraphQL))
      )
      : chain[index].execute({
        operation,
        request,
        next: (request) => execute(index + 1, request) as Effect.Effect<ExecutionResult, GraphQLClientError>
      })

  const subscribe = (index: number, request: GraphQLRequest): Stream.Stream<ExecutionResult, any, any> =>
    index === chain.length
      ? protocol.subscribe(request).pipe(
        Stream.mapError(fail),
        Stream.mapEffect((event) => Effect.catch(decodeExecutionResult(event), notGraphQL))
      )
      : chain[index].subscribe({
        operation,
        request,
        next: (request) => subscribe(index + 1, request) as Stream.Stream<ExecutionResult, GraphQLClientError>
      })

  const decodeData = (result: ExecutionResult) =>
    Effect.catch(decodeResult(result.data), schemaFail((description) => new DecodeError({ description })))

  const responseError = (result: ExecutionResult, errors: ReadonlyArray<GraphQLError>) =>
    Effect.fail(fail(
      new ResponseError({
        errors: errors as unknown as ConstructorParameters<typeof ResponseError>[0]["errors"],
        ...(result.data === undefined ? {} : { data: result.data as Schema.Json }),
        ...(result.extensions === undefined ? {} : { extensions: result.extensions })
      })
    ))

  const finish = (result: ExecutionResult, partial: boolean): Effect.Effect<unknown, any, any> => {
    const errors = result.errors ?? []
    if (errors.length > 0) {
      // Without partial results any error fails the call. With them, errors
      // and a missing data still mean there is nothing to return.
      if (!partial || result.data === null || result.data === undefined) {
        return responseError(result, errors)
      }
      return Effect.map(decodeData(result), (data) => ({ data, errors }))
    }
    return partial ? Effect.map(decodeData(result), (data) => ({ data, errors })) : decodeData(result)
  }

  if (operation.kind === "subscription") {
    const method = (variables?: unknown, options?: CallOptions<any>) => {
      const stream = Stream.unwrap(
        Effect.map(buildRequest(variables, options), (request) => subscribe(0, request))
      ).pipe(
        Stream.mapEffect((event) => finish(event, false)),
        Stream.retry(retryPolicy)
      )
      return options?.context === undefined
        ? stream
        : Stream.updateContext(stream, (outer) => Context.merge(outer, options.context!))
    }
    return Object.assign(method, { operation })
  }

  const method = (variables?: unknown, options?: StrictCallOptions<any> | PartialCallOptions<any>) => {
    const effect = buildRequest(variables, options).pipe(
      Effect.flatMap((request) => execute(0, request)),
      Effect.flatMap((result) => finish(result, options?.partial === true))
    )
    return options?.context === undefined
      ? effect
      : Effect.updateContext(effect, (outer) => Context.merge(outer, options.context!))
  }
  return Object.assign(method, { operation })
}

/**
 * The `pageInfo` a paged connection must select.
 *
 * @stability experimental
 * @category paging
 * @since 4.0.0
 */
export interface PageInfo {
  readonly hasNextPage: boolean
  readonly endCursor: string | null
}

/**
 * What the `connection` getter of {@link pages} must return.
 *
 * @stability experimental
 * @category paging
 * @since 4.0.0
 */
export interface Connection {
  readonly pageInfo: PageInfo
}

/**
 * What the `connection` getter of {@link items} must return: a connection
 * that also selects `nodes`.
 *
 * @stability experimental
 * @category paging
 * @since 4.0.0
 */
export interface NodesConnection<Node> extends Connection {
  readonly nodes: ReadonlyArray<Node> | null
}

/**
 * The type `variables` is given when the operation has no `$after` variable.
 * Nothing is assignable to it, so the mistake is a compile error at the call.
 *
 * @stability experimental
 * @category paging
 * @since 4.0.0
 */
export interface MissingAfterVariable {
  readonly "effect/graphql":
    "GraphQLClient.pages requires the operation to declare a nullable `$after: String` variable"
}

/**
 * The `variables` accepted by {@link pages} and {@link items}: the method's
 * variables without `after`, which the helper supplies.
 *
 * @stability experimental
 * @category paging
 * @since 4.0.0
 */
export type PagingVariables<Variables> = "after" extends keyof Variables ? Omit<Variables, "after">
  : MissingAfterVariable

/**
 * Options for {@link pages} and {@link items}. `options` is forwarded to every
 * page and cannot carry `partial`: a page with errors fails the stream.
 *
 * @stability experimental
 * @category paging
 * @since 4.0.0
 */
export interface PagingOptions<Op extends GraphQL.Any, C, R2> {
  readonly variables: PagingVariables<GraphQL.Variables<Op>>
  readonly connection: (result: GraphQL.Result<Op>) => C | null | undefined
  readonly options?: CallOptions<R2> | undefined
}

interface PagingState {
  readonly after: string | undefined
  readonly done: boolean
}

/**
 * Pages forward through a cursor connection, emitting one connection per
 * page.
 *
 * **Details**
 *
 * The cursor variable is always `$after`: the operation's variables must
 * accept `after?: string | null`, which is what a nullable `$after: String`
 * becomes. The first page is fetched without `after`; every later page sends
 * the previous page's `endCursor`. Pages are fetched one at a time and only
 * when pulled, so `Stream.take` stops further requests. Each page is a normal
 * method call, so middleware runs on every page.
 *
 * The stream ends after a page whose `hasNextPage` is `false`. A `null`
 * connection on the first page gives an empty stream; on a later page it
 * fails with a `PaginationError`, as does `hasNextPage: true` with a `null`
 * or unchanged `endCursor`.
 *
 * Root fields that come with every page, such as GitHub's `rateLimit`, are for
 * middleware to read from the raw `ExecutionResult`.
 *
 * **Example** (Paging issues, two per page)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema, Stream } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol } from "effect/graphql"
 *
 * const RepoIssues = GraphQL.query("RepoIssues", {
 *   document: "query RepoIssues($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){issues(first:2,after:$after){pageInfo{hasNextPage endCursor}nodes{number}}}}",
 *   variables: { owner: Schema.String, name: Schema.String, after: Schema.optional(Schema.NullOr(Schema.String)) },
 *   result: Schema.Struct({
 *     repository: Schema.NullOr(Schema.Struct({
 *       issues: Schema.Struct({
 *         pageInfo: Schema.Struct({ hasNextPage: Schema.Boolean, endCursor: Schema.NullOr(Schema.String) }),
 *         nodes: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.Struct({ number: Schema.Int }))))
 *       })
 *     }))
 *   })
 * })
 *
 * // A scripted server with two pages
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: (request) => {
 *     const after = (request.variables as { after?: string }).after
 *     const page = after === undefined
 *       ? { pageInfo: { hasNextPage: true, endCursor: "c1" }, nodes: [{ number: 1 }, { number: 2 }] }
 *       : { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ number: 3 }] }
 *     return Effect.succeed({ data: { repository: { issues: page } } })
 *   },
 *   subscribe: () => Stream.empty
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(RepoIssues))
 *   const pages = GraphQLClient.pages(client.RepoIssues, {
 *     variables: { owner: "Effect-TS", name: "effect" },
 *     connection: (result) => result.repository?.issues
 *   })
 *   return yield* Stream.runCollect(Stream.map(pages, (page) => page.pageInfo.endCursor))
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Scripted))) // => ["c1", null]
 * ```
 *
 * @stability experimental
 * @category paging
 * @since 4.0.0
 */
export const pages = <Op extends GraphQL.Any, C extends Connection, R2 = never>(
  method: OperationMethod<Op>,
  options: PagingOptions<Op, C, R2>
): Stream.Stream<C, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>> => {
  const call = method as unknown as (variables: unknown, options?: CallOptions<any>) => Effect.Effect<any, any, any>
  const paginationError = (description: string, cursor: string | null) =>
    Effect.fail(
      new GraphQLClientError({
        operation: method.operation.name,
        reason: new PaginationError({ description, cursor })
      })
    )
  const next = (connection: C, state: PagingState): readonly [C, PagingState] => [connection, state]
  return Stream.unfold<PagingState, C, GraphQL.Error<Op>, any>({ after: undefined, done: false }, (state) => {
    if (state.done) return Effect.succeed(undefined)
    const variables = state.after === undefined ? options.variables : { ...options.variables, after: state.after }
    return Effect.flatMap(call(variables, options.options), (result) => {
      const connection = options.connection(result)
      const cursor = state.after ?? null
      if (connection === null || connection === undefined) {
        return state.after === undefined
          ? Effect.succeed(undefined)
          : paginationError("The connection was null on a page after the first", cursor)
      }
      const { endCursor, hasNextPage } = connection.pageInfo
      if (!hasNextPage) {
        return Effect.succeed(next(connection, { after: state.after, done: true }))
      }
      if (endCursor === null) {
        return paginationError("hasNextPage is true but endCursor is null", cursor)
      }
      if (endCursor === state.after) {
        return paginationError(`endCursor "${endCursor}" did not advance`, cursor)
      }
      return Effect.succeed(next(connection, { after: endCursor, done: false }))
    })
  })
}

/**
 * Like {@link pages}, but emits each entry of the connection's `nodes` with
 * its decoded type. `null` entries are kept, because `nodes` on a nullable
 * list type such as GitHub's `[Issue]` can contain them; pipe through
 * `Stream.filter(Predicate.isNotNull)` to drop them. A connection that only
 * selects `edges` is paged with {@link pages} plus `Stream.flatMap`.
 *
 * **Example** (Flattening issue numbers across pages)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema, Stream } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol } from "effect/graphql"
 *
 * const RepoIssues = GraphQL.query("RepoIssues", {
 *   document: "query RepoIssues($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){issues(first:2,after:$after){pageInfo{hasNextPage endCursor}nodes{number}}}}",
 *   variables: { owner: Schema.String, name: Schema.String, after: Schema.optional(Schema.NullOr(Schema.String)) },
 *   result: Schema.Struct({
 *     repository: Schema.NullOr(Schema.Struct({
 *       issues: Schema.Struct({
 *         pageInfo: Schema.Struct({ hasNextPage: Schema.Boolean, endCursor: Schema.NullOr(Schema.String) }),
 *         nodes: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.Struct({ number: Schema.Int }))))
 *       })
 *     }))
 *   })
 * })
 *
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: (request) => {
 *     const after = (request.variables as { after?: string }).after
 *     const page = after === undefined
 *       ? { pageInfo: { hasNextPage: true, endCursor: "c1" }, nodes: [{ number: 1 }, null] }
 *       : { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ number: 3 }] }
 *     return Effect.succeed({ data: { repository: { issues: page } } })
 *   },
 *   subscribe: () => Stream.empty
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(RepoIssues))
 *   const items = GraphQLClient.items(client.RepoIssues, {
 *     variables: { owner: "Effect-TS", name: "effect" },
 *     connection: (result) => result.repository?.issues
 *   })
 *   return yield* Stream.runCollect(Stream.map(items, (issue) => issue?.number ?? null))
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Scripted))) // => [1, null, 3]
 * ```
 *
 * @stability experimental
 * @category paging
 * @since 4.0.0
 */
export const items = <Op extends GraphQL.Any, Node, R2 = never>(
  method: OperationMethod<Op>,
  options: PagingOptions<Op, NodesConnection<Node>, R2>
): Stream.Stream<Node, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>> =>
  Stream.flatMap(pages(method, options), (connection) => Stream.fromArray(connection.nodes ?? []))
