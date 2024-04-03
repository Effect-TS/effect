/**
 * @since 2.0.0
 */

import * as Context from "./Context.js"
import * as Effect from "./Effect.js"
import type * as Either from "./Either.js"
import type * as Equal from "./Equal.js"
import type { FiberRef } from "./FiberRef.js"
import * as core from "./internal/core.js"
import * as internal from "./internal/dataSource.js"
import type { Pipeable } from "./Pipeable.js"
import type * as Request from "./Request.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const RequestResolverTypeId: unique symbol = core.RequestResolverTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type RequestResolverTypeId = typeof RequestResolverTypeId

/**
 * A `RequestResolver<A, R>` requires an environment `R` and is capable of executing
 * requests of type `A`.
 *
 * Data sources must implement the method `runAll` which takes a collection of
 * requests and returns an effect with a `RequestCompletionMap` containing a
 * mapping from requests to results. The type of the collection of requests is
 * a `Chunk<Chunk<A>>`. The outer `Chunk` represents batches of requests that
 * must be performed sequentially. The inner `Chunk` represents a batch of
 * requests that can be performed in parallel. This allows data sources to
 * introspect on all the requests being executed and optimize the query.
 *
 * Data sources will typically be parameterized on a subtype of `Request<A>`,
 * though that is not strictly necessarily as long as the data source can map
 * the request type to a `Request<A>`. Data sources can then pattern match on
 * the collection of requests to determine the information requested, execute
 * the query, and place the results into the `RequestCompletionMap` using
 * `RequestCompletionMap.empty` and `RequestCompletionMap.insert`. Data
 * sources must provide results for all requests received. Failure to do so
 * will cause a query to die with a `QueryFailure` when run.
 *
 * @since 2.0.0
 * @category models
 */
export interface RequestResolver<in A, out R = never> extends RequestResolver.Variance<A, R>, Equal.Equal, Pipeable {
  /**
   * Execute a collection of requests. The outer `Chunk` represents batches
   * of requests that must be performed sequentially. The inner `Chunk`
   * represents a batch of requests that can be performed in parallel.
   */
  runAll(requests: Array<Array<Request.Entry<A>>>): Effect.Effect<void, never, R>

  /**
   * Identify the data source using the specific identifier
   */
  identified(...identifiers: Array<unknown>): RequestResolver<A, R>
}

/**
 * @since 2.0.0
 */
export declare namespace RequestResolver {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<in A, out R> {
    readonly [RequestResolverTypeId]: {
      readonly _A: Types.Contravariant<A>
      readonly _R: Types.Covariant<R>
    }
  }
}

/**
 * @since 2.0.0
 * @category utils
 */
export const contextFromEffect = <R, A extends Request.Request<any, any>>(self: RequestResolver<A, R>) =>
  Effect.contextWith((_: Context.Context<R>) => provideContext(self, _))

/**
 * @since 2.0.0
 * @category utils
 */
export const contextFromServices =
  <Services extends Array<Context.Tag<any, any>>>(...services: Services) =>
  <R, A extends Request.Request<any, any>>(
    self: RequestResolver<A, R>
  ): Effect.Effect<
    RequestResolver<A, Exclude<R, { [k in keyof Services]: Effect.Effect.Context<Services[k]> }[number]>>,
    never,
    { [k in keyof Services]: Effect.Effect.Context<Services[k]> }[number]
  > => Effect.contextWith((_) => provideContext(self as any, Context.pick(...services)(_ as any)))

/**
 * Returns `true` if the specified value is a `RequestResolver`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isRequestResolver: (u: unknown) => u is RequestResolver<unknown, unknown> = core.isRequestResolver

/**
 * Constructs a data source with the specified identifier and method to run
 * requests.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <A, R>(
  runAll: (requests: Array<Array<A>>) => Effect.Effect<void, never, R>
) => RequestResolver<A, R> = internal.make

/**
 * Constructs a data source with the specified identifier and method to run
 * requests.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeWithEntry: <A, R>(
  runAll: (requests: Array<Array<Request.Entry<A>>>) => Effect.Effect<void, never, R>
) => RequestResolver<A, R> = internal.makeWithEntry

/**
 * Constructs a data source from a function taking a collection of requests
 * and returning a `RequestCompletionMap`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeBatched: <A extends Request.Request<any, any>, R>(
  run: (requests: Array<A>) => Effect.Effect<void, never, R>
) => RequestResolver<A, R> = internal.makeBatched

/**
 * A data source aspect that executes requests between two effects, `before`
 * and `after`, where the result of `before` can be used by `after`.
 *
 * @since 2.0.0
 * @category combinators
 */
export const around: {
  <A2, R2, X, R3>(
    before: Effect.Effect<A2, never, R2>,
    after: (a: A2) => Effect.Effect<X, never, R3>
  ): <A, R>(self: RequestResolver<A, R>) => RequestResolver<A, R2 | R3 | R>
  <A, R, A2, R2, X, R3>(
    self: RequestResolver<A, R>,
    before: Effect.Effect<A2, never, R2>,
    after: (a: A2) => Effect.Effect<X, never, R3>
  ): RequestResolver<A, R | R2 | R3>
} = internal.around

/**
 * A data source aspect that executes requests between two effects, `before`
 * and `after`, where the result of `before` can be used by `after`.
 *
 * The `before` and `after` effects are provided with the requests being executed.
 *
 * @since 2.0.0
 * @category combinators
 * @example
 * import { Effect, Request, RequestResolver } from "effect"
 *
 * interface GetUserById extends Request.Request<unknown> {
 *   readonly id: number
 * }
 *
 * const resolver = RequestResolver.fromFunction(
 *   (request: GetUserById) => ({ id: request.id, name: "John" })
 * )
 *
 * RequestResolver.aroundRequests(
 *   resolver,
 *   (requests) => Effect.log(`got ${requests.length} requests`),
 *   (requests, _) => Effect.log(`finised running ${requests.length} requests`)
 * )
 */
export const aroundRequests: {
  <A, A2, R2, X, R3>(
    before: (requests: ReadonlyArray<NoInfer<A>>) => Effect.Effect<A2, never, R2>,
    after: (requests: ReadonlyArray<NoInfer<A>>, _: A2) => Effect.Effect<X, never, R3>
  ): <R>(self: RequestResolver<A, R>) => RequestResolver<A, R2 | R3 | R>
  <A, R, A2, R2, X, R3>(
    self: RequestResolver<A, R>,
    before: (requests: ReadonlyArray<NoInfer<A>>) => Effect.Effect<A2, never, R2>,
    after: (requests: ReadonlyArray<NoInfer<A>>, _: A2) => Effect.Effect<X, never, R3>
  ): RequestResolver<A, R | R2 | R3>
} = internal.aroundRequests

/**
 * Returns a data source that executes at most `n` requests in parallel.
 *
 * @since 2.0.0
 * @category combinators
 */
export const batchN: {
  (n: number): <A, R>(self: RequestResolver<A, R>) => RequestResolver<A, R>
  <A, R>(self: RequestResolver<A, R>, n: number): RequestResolver<A, R>
} = internal.batchN

/**
 * Provides this data source with part of its required context.
 *
 * @since 2.0.0
 * @category context
 */
export const mapInputContext: {
  <R0, R>(
    f: (context: Context.Context<R0>) => Context.Context<R>
  ): <A extends Request.Request<any, any>>(self: RequestResolver<A, R>) => RequestResolver<A, R0>
  <R, A extends Request.Request<any, any>, R0>(
    self: RequestResolver<A, R>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ): RequestResolver<A, R0>
} = internal.mapInputContext

/**
 * Returns a new data source that executes requests of type `C` using the
 * specified function to transform `C` requests into requests that either this
 * data source or that data source can execute.
 *
 * @since 2.0.0
 * @category combinators
 */
export const eitherWith: {
  <A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>, C extends Request.Request<any, any>>(
    that: RequestResolver<B, R2>,
    f: (_: Request.Entry<C>) => Either.Either<Request.Entry<B>, Request.Entry<A>>
  ): <R>(self: RequestResolver<A, R>) => RequestResolver<C, R2 | R>
  <
    R,
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    self: RequestResolver<A, R>,
    that: RequestResolver<B, R2>,
    f: (_: Request.Entry<C>) => Either.Either<Request.Entry<B>, Request.Entry<A>>
  ): RequestResolver<C, R | R2>
} = internal.eitherWith

/**
 * Constructs a data source from a pure function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromFunction: <A extends Request.Request<any>>(
  f: (request: A) => Request.Request.Success<A>
) => RequestResolver<A> = internal.fromFunction

/**
 * Constructs a data source from a pure function that takes a list of requests
 * and returns a list of results of the same size. Each item in the result
 * list must correspond to the item at the same index in the request list.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromFunctionBatched: <A extends Request.Request<any>>(
  f: (chunk: Array<A>) => Iterable<Request.Request.Success<A>>
) => RequestResolver<A> = internal.fromFunctionBatched

/**
 * Constructs a data source from an effectual function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEffect: <R, A extends Request.Request<any, any>>(
  f: (a: A) => Effect.Effect<Request.Request.Success<A>, Request.Request.Error<A>, R>
) => RequestResolver<A, R> = internal.fromEffect

/**
 * Constructs a data source from a list of tags paired to functions, that takes
 * a list of requests and returns a list of results of the same size. Each item
 * in the result list must correspond to the item at the same index in the
 * request list.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEffectTagged: <A extends Request.Request<any, any> & { readonly _tag: string }>() => <
  Fns extends {
    readonly [Tag in A["_tag"]]: [Extract<A, { readonly _tag: Tag }>] extends [infer Req]
      ? Req extends Request.Request<infer ReqA, infer ReqE>
        ? (requests: Array<Req>) => Effect.Effect<Iterable<ReqA>, ReqE, any>
      : never
      : never
  }
>(
  fns: Fns
) => RequestResolver<A, ReturnType<Fns[keyof Fns]> extends Effect.Effect<infer _A, infer _E, infer R> ? R : never> =
  internal.fromEffectTagged

/**
 * A data source that never executes requests.
 *
 * @since 2.0.0
 * @category constructors
 */
export const never: RequestResolver<never> = internal.never

/**
 * Provides this data source with its required context.
 *
 * @since 2.0.0
 * @category context
 */
export const provideContext: {
  <R>(
    context: Context.Context<R>
  ): <A extends Request.Request<any, any>>(self: RequestResolver<A, R>) => RequestResolver<A>
  <R, A extends Request.Request<any, any>>(
    self: RequestResolver<A, R>,
    context: Context.Context<R>
  ): RequestResolver<A>
} = internal.provideContext

/**
 * Returns a new data source that executes requests by sending them to this
 * data source and that data source, returning the results from the first data
 * source to complete and safely interrupting the loser.
 *
 * @since 2.0.0
 * @category combinators
 */
export const race: {
  <A2 extends Request.Request<any, any>, R2>(
    that: RequestResolver<A2, R2>
  ): <A extends Request.Request<any, any>, R>(self: RequestResolver<A, R>) => RequestResolver<A2 | A, R2 | R>
  <A extends Request.Request<any, any>, R, A2 extends Request.Request<any, any>, R2>(
    self: RequestResolver<A, R>,
    that: RequestResolver<A2, R2>
  ): RequestResolver<A | A2, R | R2>
} = internal.race

/**
 * Returns a new data source with a localized FiberRef
 *
 * @since 2.0.0
 * @category combinators
 */
export const locally: {
  <A>(
    self: FiberRef<A>,
    value: A
  ): <R, B extends Request.Request<any, any>>(use: RequestResolver<B, R>) => RequestResolver<B, R>
  <R, B extends Request.Request<any, any>, A>(
    use: RequestResolver<B, R>,
    self: FiberRef<A>,
    value: A
  ): RequestResolver<B, R>
} = core.resolverLocally
