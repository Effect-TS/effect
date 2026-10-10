/**
 * GraphQL-level client middleware.
 *
 * **Details**
 *
 * A middleware is a `Context.Service` tag whose value is the implementation,
 * so it is provided with `Layer.succeed` or `Layer.effect` and mocked in tests
 * like any other service. It wraps every operation it is attached to at the
 * GraphQL level: it can rewrite the request (headers, extensions, variables)
 * before it reaches the transport and inspect the raw `ExecutionResult` that
 * comes back.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import { getStackTraceLimit, setStackTraceLimit } from "../internal/stackTraceLimit.ts"
import * as Stream from "../Stream.ts"
import type * as Types from "../Types.ts"
import type * as GraphQL from "./GraphQL.ts"
import type { GraphQLClientError } from "./GraphQLClientError.ts"
import type { ExecutionResult, GraphQLRequest } from "./GraphQLProtocol.ts"

const TypeId = "~effect/graphql/GraphQLMiddleware"

/**
 * What a middleware's `execute` member receives: the operation being run, the
 * request so far, and `next`, which runs the rest of the chain and returns
 * the raw `ExecutionResult`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface ExecuteOptions {
  readonly operation: GraphQL.Any
  readonly request: GraphQLRequest
  readonly next: (request: GraphQLRequest) => Effect.Effect<ExecutionResult, GraphQLClientError>
}

/**
 * What a middleware's `subscribe` member receives. `next` subscribes with the
 * given request and returns the stream of raw `ExecutionResult` events.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SubscribeOptions {
  readonly operation: GraphQL.Any
  readonly request: GraphQLRequest
  readonly next: (request: GraphQLRequest) => Stream.Stream<ExecutionResult, GraphQLClientError>
}

/**
 * A middleware implementation. Both members are required, so a middleware can
 * never silently skip subscriptions.
 *
 * **Details**
 *
 * `execute` runs once per query or mutation. `subscribe` runs once per
 * subscription attempt (the client re-runs the whole chain when it retries a
 * subscription) and can map or tap the event stream.
 *
 * Use {@link mapRequest} when the middleware only needs to transform the
 * request.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Implementation<E = never, R = never> {
  readonly execute: (options: ExecuteOptions) => Effect.Effect<ExecutionResult, GraphQLClientError | E, R>
  readonly subscribe: (options: SubscribeOptions) => Stream.Stream<ExecutionResult, GraphQLClientError | E, R>
}

/**
 * The class returned by {@link Service}: a `Context.Service` for an
 * {@link Implementation}, carrying the declared `error` and `requires` types.
 *
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export interface ServiceClass<Self, Key extends string, E, R> extends Context.Service<Self, Implementation<E, R>> {
  new(_: never): Context.ServiceClass.Shape<Key, Implementation<E, R>> & {
    readonly [TypeId]: { readonly error: E; readonly requires: R }
  }
  readonly [TypeId]: { readonly error: E; readonly requires: R }
  readonly key: Key
}

/**
 * Any middleware service class, with its error and requirement types erased.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export interface AnyService extends Context.Service<any, Implementation<any, any>> {
  readonly [TypeId]: { readonly error: any; readonly requires: any }
}

/**
 * Extracts the service identifier of a middleware, which is what
 * `GraphQLClient.make` requires.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export type Identifier<M> = M extends Context.Service<infer I, any> ? I : never

/**
 * Extracts the error type a middleware declared.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export type Error<M> = M extends { readonly [TypeId]: { readonly error: infer E } } ? E : never

/**
 * Extracts the services a middleware declared it requires per call.
 *
 * @stability experimental
 * @category utility types
 * @since 4.0.0
 */
export type Requires<M> = M extends { readonly [TypeId]: { readonly requires: infer R } } ? R : never

/**
 * Declares a middleware tag. `requires` are services the implementation needs
 * on every call, and `error` is what it can fail with; both show up on the
 * requirements and error type of every client method the middleware is
 * attached to.
 *
 * **Example** (An auth middleware that needs the current user)
 *
 * ```ts import.meta.vitest
 * import { Context, Effect, Layer, Schema, Stream } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLMiddleware, GraphQLProtocol } from "effect/graphql"
 *
 * class CurrentUser extends Context.Service<CurrentUser, { readonly token: string }>()("CurrentUser") {}
 * class TokenExpired extends Schema.TaggedError<TokenExpired>()("TokenExpired", {}) {}
 *
 * class Auth extends GraphQLMiddleware.Service<Auth, {
 *   requires: CurrentUser
 *   error: TokenExpired
 * }>()("app/Auth") {}
 *
 * const AuthLive = Layer.succeed(
 *   Auth,
 *   GraphQLMiddleware.mapRequest(Effect.fnUntraced(function*(request) {
 *     const user = yield* CurrentUser
 *     if (user.token === "") return yield* new TokenExpired()
 *     return { ...request, headers: { ...request.headers, authorization: `Bearer ${user.token}` } }
 *   }))
 * )
 *
 * const Viewer = GraphQL.query("Viewer", {
 *   document: "query Viewer{viewer{login}}",
 *   result: Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
 * })
 *
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: (request) => Effect.succeed({ data: { viewer: { login: request.headers.authorization } } }),
 *   subscribe: () => Stream.empty
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(Viewer).middleware(Auth))
 *   // CurrentUser is required by the method because Auth is attached
 *   return yield* client.Viewer().pipe(Effect.provideService(CurrentUser, { token: "abc" }))
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide([Scripted, AuthLive]))) // => { viewer: { login: "Bearer abc" } }
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const Service = <
  Self,
  Config extends {
    readonly requires?: any
    readonly error?: any
  } = {}
>(): <const Key extends string>(key: Key) => ServiceClass<
  Self,
  Key,
  Config extends { readonly error: infer E } ? E : never,
  Config extends { readonly requires: infer R } ? R : never
> =>
(key: string) => {
  const limit = getStackTraceLimit()
  let creationError: globalThis.Error | undefined
  if (limit !== 0) {
    setStackTraceLimit(2)
    creationError = new globalThis.Error()
    setStackTraceLimit(limit)
  }

  function ServiceClass() {}
  const ServiceClass_ = ServiceClass as any as Types.Mutable<AnyService>
  Object.setPrototypeOf(ServiceClass, Object.getPrototypeOf(Context.Service<Self, any>(key)))
  ServiceClass.key = key
  Object.defineProperty(ServiceClass, "stack", {
    get() {
      return creationError?.stack
    }
  })
  ServiceClass_[TypeId] = TypeId as any
  return ServiceClass as any
}

/**
 * Builds a full {@link Implementation} from one request transform, applied to
 * queries, mutations and subscriptions alike. This is the one-liner for
 * headers, auth and extensions.
 *
 * **Example** (Adding a header to every request)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema, Stream } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLMiddleware, GraphQLProtocol } from "effect/graphql"
 *
 * class RequestId extends GraphQLMiddleware.Service<RequestId>()("app/RequestId") {}
 *
 * const RequestIdLive = Layer.succeed(
 *   RequestId,
 *   GraphQLMiddleware.mapRequest((request) =>
 *     Effect.succeed({ ...request, headers: { ...request.headers, "x-request-id": "abc" } })
 *   )
 * )
 *
 * const Viewer = GraphQL.query("Viewer", {
 *   document: "query Viewer{viewer{login}}",
 *   result: Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
 * })
 *
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: (request) => Effect.succeed({ data: { viewer: { login: request.headers["x-request-id"] } } }),
 *   subscribe: () => Stream.empty
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(Viewer).middleware(RequestId))
 *   return yield* client.Viewer()
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide([Scripted, RequestIdLive]))) // => { viewer: { login: "abc" } }
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const mapRequest = <E = never, R = never>(
  f: (request: GraphQLRequest, operation: GraphQL.Any) => Effect.Effect<GraphQLRequest, E, R>
): Implementation<E, R> => ({
  execute: ({ next, operation, request }) => Effect.flatMap(f(request, operation), next),
  subscribe: ({ next, operation, request }) => Stream.unwrap(Effect.map(f(request, operation), next))
})
