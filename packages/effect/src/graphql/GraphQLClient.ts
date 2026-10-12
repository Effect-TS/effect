/**
 * A typed client with one method per operation in a `GraphQLGroup`. Queries
 * and mutations return an `Effect`; subscriptions return a `Stream`. The
 * client encodes variables, runs middleware, calls the `GraphQLProtocol` in
 * context and decodes results.
 *
 * Retryable subscription transport failures restart the middleware chain on
 * the `subscriptionRetry` schedule. {@link pages} and {@link items} provide
 * cursor pagination. {@link makeTest} builds a mock client for tests, and
 * {@link layerTest} provides it as a service layer. See `GraphQLProtocol`
 * for transport options.
 *
 * @stability experimental
 * @since 4.0.0
 */
import { isReadonlyArrayNonEmpty, type NonEmptyReadonlyArray } from "../Array.ts"
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import type * as Exit from "../Exit.ts"
import { identity } from "../Function.ts"
import * as Headers from "../http/Headers.ts"
import * as UrlParams from "../http/UrlParams.ts"
import * as internalGraphQL from "../internal/graphql.ts"
import { getStackTraceLimit, setStackTraceLimit } from "../internal/stackTraceLimit.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import type * as Pull from "../Pull.ts"
import * as Schedule from "../Schedule.ts"
import * as Schema from "../Schema.ts"
import * as Stream from "../Stream.ts"
import * as Struct from "../Struct.ts"
import type * as GraphQL from "./GraphQL.ts"
import {
  DecodeError,
  EncodeError,
  GraphQLClientError,
  type GraphQLError,
  isGraphQLClientError,
  PaginationError,
  type Reason
} from "./GraphQLClientError.ts"
import type * as GraphQLGroup from "./GraphQLGroup.ts"
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
 * `headers` and `urlParams` are sent by the HTTP transport, ignored over
 * graphql-ws, and visible to middleware either way as
 * `GraphQLRequest.headers` and `GraphQLRequest.urlParams`. Header options
 * accept `Headers.Input` and are normalized to `Headers.Headers` before
 * middleware runs. `context` provides
 * services for this call only, and removes them from the method's
 * requirements.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface OperationMethod<Op extends GraphQL.Any> {
  /** The operation this method runs. */
  readonly operation: Op
  <R2 = never>(
    ...args: ArgsWithOptions<GraphQL.Variables<Op>, {
      readonly headers?: Headers.Input | undefined
      readonly urlParams?: UrlParams.Input | undefined
      readonly context?: Context.Context<R2> | undefined
      readonly partial: true
    }>
  ): Effect.Effect<PartialResult<GraphQL.Result<Op>>, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>>
  <R2 = never>(
    ...args: Args<GraphQL.Variables<Op>, {
      readonly headers?: Headers.Input | undefined
      readonly urlParams?: UrlParams.Input | undefined
      readonly context?: Context.Context<R2> | undefined
      readonly partial?: false | undefined
    }>
  ): Effect.Effect<GraphQL.Result<Op>, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>>
}

/**
 * The client method for a subscription. It returns a `Stream` of decoded
 * events; an event with `errors` fails the stream with a `ResponseError`.
 * `headers`, `urlParams` and `context` work as for {@link OperationMethod}.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SubscriptionMethod<Op extends GraphQL.Any> {
  /** The operation this method runs. */
  readonly operation: Op
  <R2 = never>(
    ...args: Args<GraphQL.Variables<Op>, {
      readonly headers?: Headers.Input | undefined
      readonly urlParams?: UrlParams.Input | undefined
      readonly context?: Context.Context<R2> | undefined
    }>
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
 * Derives the client type for all operations in a `GraphQLGroup`.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export type FromGroup<Group> = GraphQLClient<GraphQLGroup.Operations<Group>>

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
    const capped = Duration.min(duration, Duration.seconds(5))
    return Effect.succeed(input.retryAfter === undefined ? capped : Duration.max(capped, input.retryAfter))
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
 * `subscriptionRetry` decides how a subscription is retried after the
 * transport fails it with a retryable `TransportError`. It defaults to
 * {@link defaultSubscriptionRetry}. Fatal errors are never retried, whatever
 * the schedule.
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
 * const ViewerGraphQLGroup = GraphQLGroup.make(Viewer)
 *
 * class GitHub extends Context.Service<GitHub>()("app/GitHub", {
 *   make: GraphQLClient.make(ViewerGraphQLGroup)
 * }) {}
 *
 * // A scripted transport; use GraphQLProtocol.layerHttp({ url }) for a real server
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: () => Effect.succeed({ body: { data: { viewer: { login: "tim" } } } }),
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
 *       body: {
 *         data: { a: { name: "a" }, b: null },
 *         errors: [{ message: "Could not resolve to a Repository", path: ["b"] }]
 *       }
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
  group: GraphQLGroup.GraphQLGroup<Ops>,
  options?: {
    readonly subscriptionRetry?: Schedule.Schedule<unknown, GraphQLClientError> | undefined
  } | undefined
): Effect.Effect<
  GraphQLClient<Ops>,
  never,
  GraphQLProtocol | GraphQLMiddleware.Identifier<GraphQL.Middleware<Ops>>
> =>
  Effect.gen(function*() {
    const protocol = yield* GraphQLProtocol
    const context = yield* Effect.context<never>()
    const retryPolicy = retryableOnly(options?.subscriptionRetry ?? defaultSubscriptionRetry)
    const client: Record<string, OperationMethod<Ops> | SubscriptionMethod<Ops>> = {}
    for (const operation of group.operations) {
      client[operation.name] = makeMethod(operation, middlewareChain(context, group, operation), protocol, retryPolicy)
    }
    // The loop cannot prove the mapped type's name/kind relationship.
    return client as GraphQLClient<Ops>
  })

/**
 * The middleware implementations an operation runs through, outermost first,
 * typed with the errors and requirements its middleware declared.
 */
type MiddlewareChain<Op extends GraphQL.Any> = ReadonlyArray<
  GraphQLMiddleware.Implementation<
    GraphQLMiddleware.Error<GraphQL.Middleware<Op>>,
    GraphQLMiddleware.Requires<GraphQL.Middleware<Op>>
  >
>

// Runtime tags erase middleware types; `make` requires all their identifiers.
const middlewareChain = <Op extends GraphQL.Any>(
  context: Context.Context<never>,
  group: GraphQLGroup.GraphQLGroup<Op>,
  operation: Op
): MiddlewareChain<Op> => [...group.middlewares, ...operation.middlewares].map((tag) => Context.getUnsafe(context, tag))

// Steps `schedule` only for retryable `GraphQLClientError`s. Middleware
// errors and fatal errors end the retries before reaching it, so a custom
// schedule can rely on its input being a `GraphQLClientError`.
const retryableOnly = <Output, Error, Env>(
  schedule: Schedule.Schedule<Output, GraphQLClientError, Error, Env>
): Schedule.Schedule<Output | undefined, unknown, Error, Env> =>
  Schedule.fromStep(Effect.map(
    Schedule.toStep(schedule),
    (step) =>
    (now: number, input: unknown): Pull.Pull<[Output | undefined, Duration.Duration], Error, Output | undefined, Env> =>
      isGraphQLClientError(input) && input.isRetryable ? step(now, input) : Cause.done(undefined)
  ))

// `status` and `headers` are transport metadata, never read from the body.
const decodeExecutionResult = Schema.decodeUnknownEffect(ExecutionResult.mapFields(Struct.omit(["status", "headers"])))

interface CallOptions<R2 = never> {
  readonly headers?: Headers.Input | undefined
  readonly urlParams?: UrlParams.Input | undefined
  readonly context?: Context.Context<R2> | undefined
  readonly partial?: boolean | undefined
}

// Type boundary: a call without `context` has `R2 = never` unless the caller
// names `R2` explicitly, so an empty context stands in for `Context<R2>`.
const callContext = <R2>(options: CallOptions<R2> | undefined): Context.Context<R2> =>
  options?.context ?? (Context.empty() as Context.Context<R2>)

const makeMethod = <Op extends GraphQL.Any>(
  operation: Op,
  chain: MiddlewareChain<Op>,
  protocol: GraphQLProtocol["Service"],
  retryPolicy: Schedule.Schedule<unknown, unknown>
): OperationMethod<Op> | SubscriptionMethod<Op> => {
  const fail = (reason: Reason) => new GraphQLClientError({ operation: operation.name, reason })
  const schemaFail = (make: (description: string) => Reason) => (error: Schema.SchemaError) =>
    Effect.fail(fail(make(error.message)))
  const encodeVariables = Schema.encodeEffect(operation.variables)
  const decodeResult = Schema.decodeUnknownEffect(operation.result)

  const notGraphQL = schemaFail((description) =>
    new DecodeError({ description: `Not a GraphQL response: ${description}` })
  )

  const buildRequest = (variables: GraphQL.Variables<Op> | undefined, options: CallOptions | undefined) =>
    encodeVariables(variables ?? {}).pipe(
      Effect.catch(schemaFail((description) => new EncodeError({ description }))),
      Effect.map((encoded): GraphQLRequest => ({
        kind: operation.kind,
        query: operation.document,
        operationName: operation.name,
        variables: encoded,
        headers: Headers.fromInput(options?.headers),
        urlParams: options?.urlParams === undefined ? UrlParams.empty : UrlParams.fromInput(options.urlParams)
      }))
    )

  const decodeResponse = ({ body, ...metadata }: {
    readonly body: unknown
    readonly status?: number | undefined
    readonly headers?: Headers.Headers | undefined
  }) =>
    decodeExecutionResult(body).pipe(
      Effect.map((result): ExecutionResult => ({ ...result, ...metadata })),
      Effect.catch(notGraphQL)
    )

  // Like RpcMiddleware, `next` hides inner middleware errors and requirements;
  // they still appear on the client method's type.
  // `forcePost` reaches only the transport, not middleware or what they call.
  const execute = (
    index: number,
    request: GraphQLRequest,
    forcePost: boolean
  ): Effect.Effect<ExecutionResult, GraphQL.Error<Op>, GraphQLMiddleware.Requires<GraphQL.Middleware<Op>>> =>
    index === chain.length
      ? protocol.execute(request).pipe(
        forcePost ? Effect.provideService(internalGraphQL.ForcePost, true) : identity,
        Effect.mapError(fail),
        Effect.flatMap(decodeResponse)
      )
      : chain[index].execute({
        operation,
        request,
        next: (request) => execute(index + 1, request, forcePost) as Effect.Effect<ExecutionResult, GraphQLClientError>
      })

  const subscribe = (
    index: number,
    request: GraphQLRequest
  ): Stream.Stream<ExecutionResult, GraphQL.Error<Op>, GraphQLMiddleware.Requires<GraphQL.Middleware<Op>>> =>
    index === chain.length
      ? protocol.subscribe(request).pipe(
        Stream.mapError(fail),
        Stream.mapEffect(decodeResponse)
      )
      : chain[index].subscribe({
        operation,
        request,
        next: (request) => subscribe(index + 1, request) as Stream.Stream<ExecutionResult, GraphQLClientError>
      })

  const decodeData = (data: unknown) =>
    Effect.catch(decodeResult(data), schemaFail((description) => new DecodeError({ description })))

  const responseError = (result: ExecutionResult, errors: NonEmptyReadonlyArray<GraphQLError>) =>
    Effect.fail(fail(internalGraphQL.responseError(result, errors)))

  // GraphQL only allows a `null` or missing `data` when there are `errors`,
  // so the result codec is not consulted for it: `Schema.Json` would accept
  // `null` and turn an invalid response into a success.
  const missingData = Effect.fail(fail(new DecodeError({ description: "data is null or missing without errors" })))

  const decodeStrict = (result: ExecutionResult) => {
    const errors = result.errors ?? []
    if (isReadonlyArrayNonEmpty(errors)) return responseError(result, errors)
    if (result.data === null || result.data === undefined) return missingData
    return decodeData(result.data)
  }

  const decodePartial = (result: ExecutionResult) => {
    const errors = result.errors ?? []
    if (result.data === null || result.data === undefined) {
      return isReadonlyArrayNonEmpty(errors) ? responseError(result, errors) : missingData
    }
    return Effect.map(decodeData(result.data), (data): PartialResult<GraphQL.Result<Op>> => {
      const partial = { data, errors }
      internalGraphQL.partialResponses.set(partial, result)
      return partial
    })
  }

  if (operation.kind === "subscription") {
    const subscriptionMethod = <R2 = never>(...[variables, options]: Args<GraphQL.Variables<Op>, CallOptions<R2>>) =>
      Stream.unwrap(Effect.map(buildRequest(variables, options), (request) => subscribe(0, request))).pipe(
        Stream.mapEffect(decodeStrict),
        Stream.retry(retryPolicy),
        Stream.provideContext(callContext(options))
      )
    return Object.assign(subscriptionMethod, { operation })
  }

  function method<R2 = never>(
    ...args: ArgsWithOptions<GraphQL.Variables<Op>, CallOptions<R2> & { readonly partial: true }>
  ): Effect.Effect<PartialResult<GraphQL.Result<Op>>, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>>
  function method<R2 = never>(
    ...args: Args<GraphQL.Variables<Op>, CallOptions<R2> & { readonly partial?: false | undefined }>
  ): Effect.Effect<GraphQL.Result<Op>, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>>
  function method<R2>(
    variables?: GraphQL.Variables<Op>,
    options?: CallOptions<R2>
  ): Effect.Effect<
    GraphQL.Result<Op> | PartialResult<GraphQL.Result<Op>>,
    GraphQL.Error<Op>,
    Exclude<GraphQL.Services<Op>, R2>
  > {
    return buildRequest(variables, options).pipe(
      Effect.flatMap((request) => execute(0, request, false)),
      Effect.flatMap(options?.partial === true ? decodePartial : decodeStrict),
      Effect.provideContext(callContext(options))
    )
  }
  const template = operation.template
  if (template === undefined) return Object.assign(method, { operation })

  // Splits a batch response by slice prefix. An error belongs to the slice
  // whose prefix starts `path[0]`; any other error fails the batch.
  const splitSlices = (result: ExecutionResult, prefixes: NonEmptyReadonlyArray<string>) => {
    const errors = result.errors ?? []
    const sliceErrors = prefixes.map((): Array<GraphQLError> => [])
    for (const error of errors) {
      const key = error.path?.[0]
      const index = typeof key === "string" ? sliceIndex(key, prefixes.length) : undefined
      if (index === undefined) return responseError(result, errors as NonEmptyReadonlyArray<GraphQLError>)
      sliceErrors[index].push(
        { ...error, path: [(key as string).slice(prefixes[index].length), ...error.path!.slice(1)] } as GraphQLError
      )
    }
    if (result.data === null || result.data === undefined) {
      return isReadonlyArrayNonEmpty(errors) ? responseError(result, errors) : missingData
    }
    const data = result.data as Record<string, unknown>
    return Effect.forEach(prefixes, (prefix, i) => {
      const sliceData: Record<string, unknown> = {}
      for (const selection of template.selections) {
        const key = (selection.alias ?? selection.name)!
        if (Object.hasOwn(data, prefix + key)) sliceData[key] = data[prefix + key]
      }
      const raw: ExecutionResult = { ...result, data: sliceData, errors: sliceErrors[i] }
      return Effect.exit(Effect.map(decodeData(sliceData), (data): PartialResult<GraphQL.Result<Op>> => {
        const partial = { data, errors: sliceErrors[i] }
        internalGraphQL.partialResponses.set(partial, raw)
        return partial
      }))
    })
  }

  // One request that repeats the operation once per distinct slice of
  // encoded variables, for `GraphQLResolver.aliased`.
  const batch = (
    variables: NonEmptyReadonlyArray<unknown>,
    options: Parameters<internalGraphQL.Batch>[1]
  ): Effect.Effect<
    ReadonlyArray<Exit.Exit<PartialResult<GraphQL.Result<Op>>, GraphQLClientError>>,
    GraphQL.Error<Op>,
    GraphQL.Services<Op>
  > =>
    Effect.flatMap(
      Effect.forEach(variables, (variables) =>
        Effect.exit(
          Effect.catch(
            encodeVariables(variables ?? {}),
            schemaFail((description) => new EncodeError({ description }))
          )
        )),
      (encoded) => {
        const slices: Array<unknown> = []
        const sliceOf = new Map<string, number>()
        const indices = encoded.map((exit) => {
          if (exit._tag === "Failure") return exit
          const key = internalGraphQL.canonicalJson(exit.value)
          let index = sliceOf.get(key)
          if (index === undefined) {
            index = slices.length
            sliceOf.set(key, index)
            slices.push(exit.value)
          }
          return index
        })
        const pick = (results: ReadonlyArray<Exit.Exit<PartialResult<GraphQL.Result<Op>>, GraphQLClientError>>) =>
          indices.map((index) =>
            typeof index === "number" ? results[index] : index as Exit.Exit<never, GraphQLClientError>
          )
        if (!isReadonlyArrayNonEmpty(slices)) return Effect.succeed(pick([]))
        const prefixes = slices.map((_, i) => `_${i}_`) as unknown as NonEmptyReadonlyArray<string>
        return Effect.suspend(() => {
          const request: GraphQLRequest = {
            kind: operation.kind,
            query: internalGraphQL.renderSlices(operation.kind, operation.name, template, prefixes),
            operationName: operation.name,
            variables: Object.fromEntries(slices.flatMap((slice, i) =>
              Object.entries(slice ?? {}).map(([name, value]) => [prefixes[i] + name, value])
            )),
            headers: Headers.fromInput(options.headers),
            urlParams: options.urlParams === undefined ? UrlParams.empty : UrlParams.fromInput(options.urlParams)
          }
          return execute(0, request, true)
        }).pipe(
          Effect.flatMap((result) =>
            splitSlices(result, prefixes)
          ),
          Effect.map(pick)
        )
      }
    )
  return Object.assign(method, { operation, [internalGraphQL.batchId]: batch })
}

const sliceIndex = (key: string, length: number): number | undefined => {
  const match = /^_(\d+)_/.exec(key)
  if (match === null) return undefined
  const index = Number(match[1])
  return index < length && match[0] === `_${index}_` ? index : undefined
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
 * The type `variables` is given when the operation's `after` variable is
 * required or does not accept a `string`. The helper leaves `after` out on the
 * first page and sends the previous `endCursor` afterwards, so it can only
 * drive an optional variable that takes a string.
 *
 * @stability experimental
 * @category paging
 * @since 4.0.0
 */
export interface InvalidAfterVariable {
  readonly "effect/graphql": "GraphQLClient.pages requires the `after` variable to be optional and to accept a string"
}

/**
 * The `variables` accepted by {@link pages} and {@link items}: the method's
 * variables without `after`, which the helper supplies.
 *
 * **Details**
 *
 * The operation's `after` variable must be optional and accept a `string`.
 * `after?: string | null`, from a nullable `$after: String`, and
 * `after?: string`, from a `$after: String!` with a default value, are both
 * accepted. A required `after` gives {@link InvalidAfterVariable}, as does one
 * that does not accept a `string`; no `after` at all gives
 * {@link MissingAfterVariable}.
 *
 * @stability experimental
 * @category paging
 * @since 4.0.0
 */
export type PagingVariables<Variables> = "after" extends keyof Variables
  ? {} extends Pick<Variables, "after"> ? string extends Variables["after"] ? Omit<Variables, "after">
    : InvalidAfterVariable
  : InvalidAfterVariable
  : MissingAfterVariable

/**
 * Pages forward through a cursor connection, emitting one connection per
 * page.
 *
 * **Details**
 *
 * Requires an optional string `$after` variable (see {@link PagingVariables}).
 * The first request omits `after`; subsequent requests use the previous
 * `endCursor`. Pages are fetched only when pulled, so `Stream.take` stops
 * further requests. Middleware runs on each page.
 *
 * `connection` extracts the connection from each result. `options` is
 * forwarded to every call but cannot include `partial`: errors fail the stream.
 * Its `headers` accept `Headers.Input`, just as for operation calls.
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
 *     return Effect.succeed({ body: { data: { repository: { issues: page } } } })
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
  options: {
    readonly variables: PagingVariables<GraphQL.Variables<Op>>
    readonly connection: (result: GraphQL.Result<Op>) => C | null | undefined
    readonly options?: {
      readonly headers?: Headers.Input | undefined
      readonly urlParams?: UrlParams.Input | undefined
      readonly context?: Context.Context<R2> | undefined
    } | undefined
  }
): Stream.Stream<C, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>> => {
  // Type boundary: `method`'s strict overload, with `variables` widened.
  // `PagingVariables` has already checked that `options.variables` plus an
  // optional string `after` are the operation's variables, but the overloads'
  // conditional parameter types over a generic `Op` cannot carry that here.
  const call = method as unknown as (
    variables: unknown,
    options: CallOptions<R2> | undefined
  ) => Effect.Effect<GraphQL.Result<Op>, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>>
  // The state is the cursor to send; the first page is fetched without one.
  return Stream.paginate(undefined as string | undefined, (after) =>
    Effect.flatMap(
      call(after === undefined ? options.variables : { ...options.variables, after }, options.options),
      (result): Effect.Effect<readonly [ReadonlyArray<C>, Option.Option<string>], GraphQLClientError> => {
        const paginationError = (description: string) =>
          Effect.fail(
            new GraphQLClientError({
              operation: method.operation.name,
              reason: new PaginationError({ description, cursor: after ?? null })
            })
          )
        const connection = options.connection(result)
        if (connection === null || connection === undefined) {
          return after === undefined
            ? Effect.succeed([[], Option.none()])
            : paginationError("The connection was null on a page after the first")
        }
        const { endCursor, hasNextPage } = connection.pageInfo
        if (!hasNextPage) return Effect.succeed([[connection], Option.none()])
        if (endCursor === null) return paginationError("hasNextPage is true but endCursor is null")
        if (endCursor === after) return paginationError(`endCursor "${endCursor}" did not advance`)
        return Effect.succeed([[connection], Option.some(endCursor)])
      }
    ))
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
 *     return Effect.succeed({ body: { data: { repository: { issues: page } } } })
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
  options: {
    readonly variables: PagingVariables<GraphQL.Variables<Op>>
    readonly connection: (result: GraphQL.Result<Op>) => NodesConnection<Node> | null | undefined
    readonly options?: {
      readonly headers?: Headers.Input | undefined
      readonly urlParams?: UrlParams.Input | undefined
      readonly context?: Context.Context<R2> | undefined
    } | undefined
  }
): Stream.Stream<Node, GraphQL.Error<Op>, Exclude<GraphQL.Services<Op>, R2>> =>
  Stream.flatMap(pages(method, options), (connection) => Stream.fromArray(connection.nodes ?? []))

/**
 * The options a {@link makeTest} handler receives: the `headers` and
 * `urlParams` the caller passed, unchanged. Headers accept `Headers.Input`;
 * unlike real transport requests, test call options are not normalized.
 *
 * @stability experimental
 * @category testing
 * @since 4.0.0
 */
export interface TestCallOptions {
  readonly headers?: Headers.Input | undefined
  readonly urlParams?: UrlParams.Input | undefined
}

/**
 * A {@link makeTest} handler for one operation. Queries and mutations return
 * an `Effect` and subscriptions a `Stream` of the decoded result type.
 *
 * @stability experimental
 * @category testing
 * @since 4.0.0
 */
export type TestHandler<Op extends GraphQL.Any> = Op["kind"] extends "subscription" ? (
    variables: GraphQL.Variables<Op>,
    options: TestCallOptions
  ) => Stream.Stream<GraphQL.Result<Op>, GraphQL.Error<Op>>
  : (
    variables: GraphQL.Variables<Op>,
    options: TestCallOptions
  ) => Effect.Effect<GraphQL.Result<Op>, GraphQL.Error<Op>>

/**
 * The handlers given to {@link makeTest}, keyed by operation name. Every
 * handler is optional.
 *
 * @stability experimental
 * @category testing
 * @since 4.0.0
 */
export type TestHandlers<Ops extends GraphQL.Any> = {
  readonly [Op in Ops as Op["name"]]?: TestHandler<Op>
}

/**
 * Builds a client for tests that answers each operation from a handler,
 * without a protocol.
 *
 * **Details**
 *
 * Handlers receive the caller's `variables` and options unchanged and return
 * values in their decoded form. Nothing is encoded, decoded or validated, and
 * no middleware runs. Called with `{ partial: true }`, a method returns
 * `{ data, errors: [] }`. Subscriptions are not retried. Every method carries
 * `.operation`, so {@link pages} and {@link items} work on it. Through
 * `GraphQLResolver.aliased`, the handler is called once per slice.
 *
 * Calling an operation without a handler dies with an `UnimplementedError`
 * defect, so `catchTag` in the code under test cannot swallow a missing stub.
 *
 * The client's methods keep the types of the real client's, including the
 * services every attached middleware requires. Code under test still has to
 * provide them, even though the mock never uses them.
 *
 * To test partial data together with `errors`, or the encode and decode path,
 * provide a scripted `GraphQLProtocol` layer to {@link make} instead.
 *
 * **Example** (Replacing a client service in tests)
 *
 * ```ts import.meta.vitest
 * import { Context, Effect, Layer, Schema } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup } from "effect/graphql"
 *
 * const RepoIssues = GraphQL.query("RepoIssues", {
 *   document: "query RepoIssues($owner:String!,$name:String!){repository(owner:$owner,name:$name){issues{totalCount}}}",
 *   variables: { owner: Schema.String, name: Schema.String },
 *   result: Schema.Struct({
 *     repository: Schema.NullOr(Schema.Struct({ issues: Schema.Struct({ totalCount: Schema.Int }) }))
 *   })
 * })
 * const GitHubGraphQLGroup = GraphQLGroup.make(RepoIssues)
 *
 * class GitHub extends Context.Service<GitHub>()("app/GitHub", {
 *   make: GraphQLClient.make(GitHubGraphQLGroup)
 * }) {}
 *
 * const GitHubTest = Layer.succeed(
 *   GitHub,
 *   GraphQLClient.makeTest(GitHubGraphQLGroup)({
 *     RepoIssues: ({ name }) => Effect.succeed({ repository: { issues: { totalCount: name.length } } })
 *   })
 * )
 *
 * const program = GitHub.use((github) => github.RepoIssues({ owner: "Effect-TS", name: "effect" }))
 *
 * await Effect.runPromise(program.pipe(Effect.provide(GitHubTest))) // => { repository: { issues: { totalCount: 6 } } }
 * ```
 *
 * @stability experimental
 * @category testing
 * @since 4.0.0
 */
export const makeTest =
  <Ops extends GraphQL.Any>(group: GraphQLGroup.GraphQLGroup<Ops>) =>
  (handlers: TestHandlers<Ops>): GraphQLClient<Ops> => {
    // Type boundary: the mapped type keys handlers by name, which a lookup by a
    // runtime name cannot follow.
    const byName = handlers as Record<string, TestHandler<Ops> | undefined>
    const client: Record<string, unknown> = {}
    for (const operation of group.operations) {
      client[operation.name] = makeTestMethod(
        operation,
        Object.hasOwn(byName, operation.name) ? byName[operation.name] : undefined
      )
    }
    // The loop cannot prove the mapped type's name/kind relationship.
    return client as GraphQLClient<Ops>
  }

/**
 * Builds a mock layer for a client service using {@link makeTest}. Bind the
 * service and group once to expose a `layerTest(handlers)` helper on the service.
 * The group fixes the operation types before the handlers are checked.
 *
 * **Example** (Binding a mock layer to a client service)
 *
 * ```ts import.meta.vitest
 * import { Context, Effect, Schema } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup } from "effect/graphql"
 *
 * const RepoIssues = GraphQL.query("RepoIssues", {
 *   document: "query RepoIssues($owner:String!,$name:String!){repository(owner:$owner,name:$name){issues{totalCount}}}",
 *   variables: { owner: Schema.String, name: Schema.String },
 *   result: Schema.Struct({
 *     repository: Schema.NullOr(Schema.Struct({ issues: Schema.Struct({ totalCount: Schema.Int }) }))
 *   })
 * })
 * const GitHubGraphQLGroup = GraphQLGroup.make(RepoIssues)
 *
 * class GitHub extends Context.Service<GitHub>()("app/GitHub", {
 *   make: GraphQLClient.make(GitHubGraphQLGroup)
 * }) {
 *   static readonly layerTest = GraphQLClient.layerTest(GitHub, GitHubGraphQLGroup)
 * }
 *
 * const program = GitHub.use((github) => github.RepoIssues({ owner: "Effect-TS", name: "effect" }))
 *
 * await Effect.runPromise(program.pipe(Effect.provide(GitHub.layerTest({
 *   RepoIssues: ({ name }) => Effect.succeed({ repository: { issues: { totalCount: name.length } } })
 * })))) // => { repository: { issues: { totalCount: 6 } } }
 * ```
 *
 * @see {@link makeTest} for mock behavior and the middleware-services limitation.
 * @stability experimental
 * @category testing
 * @since 4.0.0
 */
export const layerTest = <I, Service, Ops extends GraphQL.Any>(
  service: Context.Key<I, Service>,
  group: GraphQLGroup.GraphQLGroup<Ops> & (GraphQLClient<Ops> extends NoInfer<Service> ? unknown : never)
) =>
(handlers: TestHandlers<Ops>): Layer.Layer<I> =>
  // The group constraint checks that the mock satisfies the service shape.
  Layer.succeed(service, makeTest(group)(handlers) as unknown as Service)

// Handlers are called through these erased signatures; `makeTest` has
// already checked them against the operation.
type ErasedTestHandler = (variables: unknown, options: TestCallOptions) => unknown

const makeTestMethod = (operation: GraphQL.Any, handler: ErasedTestHandler | undefined) => {
  const subscription = operation.kind === "subscription"
  if (handler === undefined) {
    const unimplemented = () => {
      const prevLimit = getStackTraceLimit()
      setStackTraceLimit(2)
      const error = new Error(`GraphQLClient: Unimplemented operation "${operation.name}"`)
      setStackTraceLimit(prevLimit)
      error.name = "UnimplementedError"
      return subscription ? Stream.die(error) : Effect.die(error)
    }
    return subscription
      ? Object.assign(unimplemented, { operation })
      : Object.assign(unimplemented, { operation, [internalGraphQL.batchId]: unimplemented })
  }
  const call = (variables: unknown, options: (TestCallOptions & { readonly partial?: boolean }) | undefined) => {
    const run = () => handler(variables === undefined ? {} : variables, options ?? {})
    if (subscription) return Stream.suspend(run as () => Stream.Stream<unknown, unknown>)
    const result = Effect.suspend(run as () => Effect.Effect<unknown, unknown>)
    return options?.partial === true
      ? Effect.map(result, (data): PartialResult<unknown> => ({ data, errors: [] }))
      : result
  }
  if (subscription) return Object.assign(call, { operation })
  // A batch calls the handler once per slice.
  const batch: internalGraphQL.Batch = (variables, options) =>
    Effect.forEach(
      variables,
      (variables) =>
        Effect.exit(call(variables, { ...options, partial: true }) as Effect.Effect<PartialResult<unknown>, unknown>)
    )
  return Object.assign(call, { operation, [internalGraphQL.batchId]: batch })
}
