/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { RuntimeFiber } from "effect/Fiber"
import type * as FiberRef from "effect/FiberRef"
import type { Inspectable } from "effect/Inspectable"
import type { Layer } from "effect/Layer"
import type { Pipeable } from "effect/Pipeable"
import type * as Predicate from "effect/Predicate"
import type { Ref } from "effect/Ref"
import type * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import type { Cookies } from "./Cookies.js"
import type * as Error from "./HttpClientError.js"
import type * as ClientRequest from "./HttpClientRequest.js"
import type * as ClientResponse from "./HttpClientResponse.js"
import * as internal from "./internal/httpClient.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface HttpClient<A = ClientResponse.HttpClientResponse, E = never, R = never> extends Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  readonly execute: (request: ClientRequest.HttpClientRequest) => Effect.Effect<A, E, R>

  readonly get: (url: string | URL, options?: ClientRequest.Options.NoBody) => Effect.Effect<A, E, R>
  readonly head: (url: string | URL, options?: ClientRequest.Options.NoBody) => Effect.Effect<A, E, R>
  readonly post: (url: string | URL, options?: ClientRequest.Options.NoUrl) => Effect.Effect<A, E, R>
  readonly patch: (url: string | URL, options?: ClientRequest.Options.NoUrl) => Effect.Effect<A, E, R>
  readonly put: (url: string | URL, options?: ClientRequest.Options.NoUrl) => Effect.Effect<A, E, R>
  readonly del: (url: string | URL, options?: ClientRequest.Options.NoUrl) => Effect.Effect<A, E, R>
  readonly options: (url: string | URL, options?: ClientRequest.Options.NoUrl) => Effect.Effect<A, E, R>
}

/**
 * @since 1.0.0
 */
export declare namespace HttpClient {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Preprocess<E, R> = (
    request: ClientRequest.HttpClientRequest
  ) => Effect.Effect<ClientRequest.HttpClientRequest, E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Postprocess<A, E = never, R = never> = (
    request: Effect.Effect<ClientRequest.HttpClientRequest, E, R>
  ) => Effect.Effect<A, E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type WithResponse<E = never, R = never> = HttpClient<ClientResponse.HttpClientResponse, E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Service = WithResponse<Error.HttpClientError, Scope.Scope>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const HttpClient: Context.Tag<HttpClient.Service, HttpClient.Service> = internal.tag

/**
 * @since 1.0.0
 * @category error handling
 */
export const catchAll: {
  <E, E2, R2, A2>(
    f: (e: E) => Effect.Effect<A2, E2, R2>
  ): <A, R>(self: HttpClient<A, E, R>) => HttpClient<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: HttpClient<A, E, R>,
    f: (e: E) => Effect.Effect<A2, E2, R2>
  ): HttpClient<A | A2, E2, R | R2>
} = internal.catchAll

/**
 * @since 1.0.0
 * @category error handling
 */
export const catchTag: {
  <E extends { _tag: string }, K extends E["_tag"] & string, A1, E1, R1>(
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<A1, E1, R1>
  ): <A, R>(self: HttpClient<A, E, R>) => HttpClient<A1 | A, E1 | Exclude<E, { _tag: K }>, R1 | R>
  <A, E extends { _tag: string }, R, K extends E["_tag"] & string, A1, E1, R1>(
    self: HttpClient<A, E, R>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<A1, E1, R1>
  ): HttpClient<A | A1, E1 | Exclude<E, { _tag: K }>, R | R1>
} = internal.catchTag

/**
 * @since 1.0.0
 * @category error handling
 */
export const catchTags: {
  <
    E extends { _tag: string },
    Cases extends { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Effect.Effect<any, any, any>) | undefined }
  >(
    cases: Cases
  ): <A, R>(
    self: HttpClient<A, E, R>
  ) => HttpClient<
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<infer A, any, any> ? A : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer R> ? R : never
    }[keyof Cases]
  >
  <
    A,
    E extends { _tag: string },
    R,
    Cases extends { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Effect.Effect<any, any, any>) | undefined }
  >(
    self: HttpClient<A, E, R>,
    cases: Cases
  ): HttpClient<
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<infer A, any, any> ? A : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer R> ? R : never
    }[keyof Cases]
  >
} = internal.catchTags

/**
 * Filters the result of a response, or runs an alternative effect if the predicate fails.
 *
 * @since 1.0.0
 * @category filters
 */
export const filterOrElse: {
  <A, B extends A, C, E2, R2>(
    refinement: Predicate.Refinement<NoInfer<A>, B>,
    orElse: (a: NoInfer<A>) => Effect.Effect<C, E2, R2>
  ): <E, R>(self: HttpClient<A, E, R>) => HttpClient<B | C, E | E2, R | R2>
  <A, B, E2, R2>(
    predicate: Predicate.Predicate<NoInfer<A>>,
    orElse: (a: NoInfer<A>) => Effect.Effect<B, E2, R2>
  ): <E, R>(
    self: HttpClient<A, E, R>
  ) => HttpClient<A | B, E2 | E, R2 | R>
  <A, E, R, B extends A, C, E2, R2>(
    self: HttpClient<A, E, R>,
    refinement: Predicate.Refinement<A, B>,
    orElse: (a: A) => Effect.Effect<C, E2, R2>
  ): HttpClient<B | C, E | E2, R | R2>
  <A, E, R, B, E2, R2>(
    self: HttpClient<A, E, R>,
    predicate: Predicate.Predicate<A>,
    orElse: (a: A) => Effect.Effect<B, E2, R2>
  ): HttpClient<A | B, E2 | E, R2 | R>
} = internal.filterOrElse

/**
 * Filters the result of a response, or throws an error if the predicate fails.
 *
 * @since 1.0.0
 * @category filters
 */
export const filterOrFail: {
  <A, B extends A, E2>(
    refinement: Predicate.Refinement<NoInfer<A>, B>,
    orFailWith: (a: NoInfer<A>) => E2
  ): <E, R>(self: HttpClient<A, E, R>) => HttpClient<B, E | E2, R>
  <A, E2>(
    predicate: Predicate.Predicate<NoInfer<A>>,
    orFailWith: (a: NoInfer<A>) => E2
  ): <E, R>(self: HttpClient<A, E, R>) => HttpClient<A, E2 | E, R>
  <A, B extends A, E, R, E2>(
    self: HttpClient<A, E, R>,
    refinement: Predicate.Refinement<A, B>,
    orFailWith: (a: A) => E2
  ): HttpClient<B, E2 | E, R>
  <A, E, R, E2>(
    self: HttpClient<A, E, R>,
    predicate: Predicate.Predicate<A>,
    orFailWith: (a: A) => E2
  ): HttpClient<A, E2 | E, R>
} = internal.filterOrFail

/**
 * Filters responses by HTTP status code.
 *
 * @since 1.0.0
 * @category filters
 */
export const filterStatus: {
  (
    f: (status: number) => boolean
  ): <E, R>(self: HttpClient.WithResponse<E, R>) => HttpClient.WithResponse<E | Error.ResponseError, R>
  <E, R>(
    self: HttpClient.WithResponse<E, R>,
    f: (status: number) => boolean
  ): HttpClient.WithResponse<Error.ResponseError | E, R>
} = internal.filterStatus

/**
 * Filters responses that return a 2xx status code.
 *
 * @since 1.0.0
 * @category filters
 */
export const filterStatusOk: <E, R>(
  self: HttpClient.WithResponse<E, R>
) => HttpClient.WithResponse<Error.ResponseError | E, R> = internal.filterStatusOk

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <A, E, R, E2, R2>(
  execute: (request: Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>) => Effect.Effect<A, E, R>,
  preprocess: HttpClient.Preprocess<E2, R2>
) => HttpClient<A, E, R> = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeService: (
  f: (
    request: ClientRequest.HttpClientRequest,
    url: URL,
    signal: AbortSignal,
    fiber: RuntimeFiber<ClientResponse.HttpClientResponse, Error.HttpClientError>
  ) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, Scope.Scope>
) => HttpClient.Service = internal.makeService

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const transform: {
  <A, E, R, A1, E1, R1>(
    f: (effect: Effect.Effect<A, E, R>, request: ClientRequest.HttpClientRequest) => Effect.Effect<A1, E1, R1>
  ): (self: HttpClient<A, E, R>) => HttpClient<A1, E | E1, R | R1>
  <A, E, R, A1, E1, R1>(
    self: HttpClient<A, E, R>,
    f: (effect: Effect.Effect<A, E, R>, request: ClientRequest.HttpClientRequest) => Effect.Effect<A1, E1, R1>
  ): HttpClient<A1, E | E1, R | R1>
} = internal.transform

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const transformResponse: {
  <A, E, R, A1, E1, R1>(
    f: (effect: Effect.Effect<A, E, R>) => Effect.Effect<A1, E1, R1>
  ): (self: HttpClient<A, E, R>) => HttpClient<A1, E1, R1>
  <A, E, R, A1, E1, R1>(
    self: HttpClient<A, E, R>,
    f: (effect: Effect.Effect<A, E, R>) => Effect.Effect<A1, E1, R1>
  ): HttpClient<A1, E1, R1>
} = internal.transformResponse

/**
 * Transforms the result of a request.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const map: {
  <A, B>(f: (a: A) => B): <E, R>(self: HttpClient<A, E, R>) => HttpClient<B, E, R>
  <A, E, R, B>(self: HttpClient<A, E, R>, f: (a: A) => B): HttpClient<B, E, R>
} = internal.map

/**
 * Transforms the result of a request using an effectful function.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapEffect: {
  <A, B, E2, R2>(
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): <E, R>(self: HttpClient<A, E, R>) => HttpClient<B, E2 | E, R2 | R>
  <A, E, R, B, E2, R2>(self: HttpClient<A, E, R>, f: (a: A) => Effect.Effect<B, E2, R2>): HttpClient<B, E | E2, R2 | R>
} = internal.mapEffect

/**
 * Appends a transformation of the request object before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapRequest: {
  (
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ): <A, E, R>(self: HttpClient<A, E, R>) => HttpClient<A, E, R>
  <A, E, R>(
    self: HttpClient<A, E, R>,
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ): HttpClient<A, E, R>
} = internal.mapRequest

/**
 * Appends an effectful transformation of the request object before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapRequestEffect: {
  <E2, R2>(
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ): <A, E, R>(self: HttpClient<A, E, R>) => HttpClient<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(
    self: HttpClient<A, E, R>,
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ): HttpClient<A, E | E2, R | R2>
} = internal.mapRequestEffect

/**
 * Prepends a transformation of the request object before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapRequestInput: {
  (
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ): <A, E, R>(self: HttpClient<A, E, R>) => HttpClient<A, E, R>
  <A, E, R>(
    self: HttpClient<A, E, R>,
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ): HttpClient<A, E, R>
} = internal.mapRequestInput

/**
 * Prepends an effectful transformation of the request object before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapRequestInputEffect: {
  <E2, R2>(
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ): <A, E, R>(self: HttpClient<A, E, R>) => HttpClient<A, E2 | E, R2 | R>
  <A, E, R, E2, R2>(
    self: HttpClient<A, E, R>,
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ): HttpClient<A, E | E2, R2 | R>
} = internal.mapRequestInputEffect

/**
 * @since 1.0.0
 * @category error handling
 */
export declare namespace Retry {
  /**
   * @since 1.0.0
   * @category error handling
   */
  export type Return<R, E, A, O extends Effect.Retry.Options<E>> = HttpClient<
    A,
    | (O extends { schedule: Schedule.Schedule<infer _O, infer _I, infer _R> } ? E
      : O extends { until: Predicate.Refinement<E, infer E2> } ? E2
      : E)
    | (O extends { while: (...args: Array<any>) => Effect.Effect<infer _A, infer E, infer _R> } ? E : never)
    | (O extends { until: (...args: Array<any>) => Effect.Effect<infer _A, infer E, infer _R> } ? E : never),
    | R
    | (O extends { schedule: Schedule.Schedule<infer _O, infer _I, infer R> } ? R : never)
    | (O extends { while: (...args: Array<any>) => Effect.Effect<infer _A, infer _E, infer R> } ? R : never)
    | (O extends { until: (...args: Array<any>) => Effect.Effect<infer _A, infer _E, infer R> } ? R : never)
  > extends infer Z ? Z : never
}

/**
 * Retries the request based on a provided schedule or policy.
 *
 * @since 1.0.0
 * @category error handling
 */
export const retry: {
  <E, O extends Effect.Retry.Options<E>>(options: O): <A, R>(self: HttpClient<A, E, R>) => Retry.Return<R, E, A, O>
  <B, E, R1>(
    policy: Schedule.Schedule<B, NoInfer<E>, R1>
  ): <A, R>(self: HttpClient<A, E, R>) => HttpClient<A, E, R1 | R>
  <A, E, R, O extends Effect.Retry.Options<E>>(self: HttpClient<A, E, R>, options: O): Retry.Return<R, E, A, O>
  <A, E, R, B, R1>(self: HttpClient<A, E, R>, policy: Schedule.Schedule<B, E, R1>): HttpClient<A, E, R1 | R>
} = internal.retry

/**
 * Ensures resources are properly scoped and released after execution.
 *
 * @since 1.0.0
 * @category resources & finalizers
 */
export const scoped: <A, E, R>(self: HttpClient<A, E, R>) => HttpClient<A, E, Exclude<R, Scope.Scope>> = internal.scoped

/**
 * Creates a function that validates request data against a schema before sending it.
 *
 * @since 1.0.0
 * @category schema
 */
export const schemaFunction: {
  <SA, SI, SR>(
    schema: Schema.Schema<SA, SI, SR>,
    options?: ParseOptions | undefined
  ): <A, E, R>(
    self: HttpClient<A, E, R>
  ) => (
    request: ClientRequest.HttpClientRequest
  ) => (a: SA) => Effect.Effect<A, Error.RequestError | E | ParseResult.ParseError, SR | R>
  <A, E, R, SA, SI, SR>(
    self: HttpClient<A, E, R>,
    schema: Schema.Schema<SA, SI, SR>,
    options?: ParseOptions | undefined
  ): (
    request: ClientRequest.HttpClientRequest
  ) => (a: SA) => Effect.Effect<A, Error.RequestError | ParseResult.ParseError | E, R | SR>
} = internal.schemaFunction

/**
 * Performs an additional effect after a successful request.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const tap: {
  <A, _, E2, R2>(
    f: (a: A) => Effect.Effect<_, E2, R2>
  ): <E, R>(self: HttpClient<A, E, R>) => HttpClient<A, E2 | E, R2 | R>
  <A, E, R, _, E2, R2>(self: HttpClient<A, E, R>, f: (a: A) => Effect.Effect<_, E2, R2>): HttpClient<A, E | E2, R2 | R>
} = internal.tap

/**
 * Performs an additional effect on the request before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const tapRequest: {
  <_, E2, R2>(
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>
  ): <A, E, R>(self: HttpClient<A, E, R>) => HttpClient<A, E2 | E, R2 | R>
  <A, E, R, _, E2, R2>(
    self: HttpClient<A, E, R>,
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>
  ): HttpClient<A, E | E2, R | R2>
} = internal.tapRequest

/**
 * Associates a `Ref` of cookies with the client for handling cookies across requests.
 *
 * @since 1.0.0
 * @category cookies
 */
export const withCookiesRef: {
  (ref: Ref<Cookies>): <E, R>(self: HttpClient.WithResponse<E, R>) => HttpClient.WithResponse<E, R>
  <E, R>(self: HttpClient.WithResponse<E, R>, ref: Ref<Cookies>): HttpClient.WithResponse<E, R>
} = internal.withCookiesRef

/**
 * Follows HTTP redirects up to a specified number of times.
 *
 * @since 1.0.0
 * @category redirects
 */
export const followRedirects: {
  (maxRedirects?: number | undefined): <E, R>(self: HttpClient.WithResponse<E, R>) => HttpClient.WithResponse<E, R>
  <E, R>(self: HttpClient.WithResponse<E, R>, maxRedirects?: number | undefined): HttpClient.WithResponse<E, R>
} = internal.followRedirects

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentTracerDisabledWhen: FiberRef.FiberRef<Predicate.Predicate<ClientRequest.HttpClientRequest>> =
  internal.currentTracerDisabledWhen

/**
 * Disables tracing for specific requests based on a provided predicate.
 *
 * @since 1.0.0
 * @category fiber refs
 */
export const withTracerDisabledWhen: {
  (
    predicate: Predicate.Predicate<ClientRequest.HttpClientRequest>
  ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    predicate: Predicate.Predicate<ClientRequest.HttpClientRequest>
  ): Effect.Effect<A, E, R>
} = internal.withTracerDisabledWhen

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentTracerPropagation: FiberRef.FiberRef<boolean> = internal.currentTracerPropagation

/**
 * Enables or disables tracing propagation for the request.
 *
 * @since 1.0.0
 * @category fiber refs
 */
export const withTracerPropagation: {
  (enabled: boolean): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(effect: Effect.Effect<A, E, R>, enabled: boolean): Effect.Effect<A, E, R>
} = internal.withTracerPropagation

/**
 * @since 1.0.0
 */
export const layerMergedContext: <E, R>(
  effect: Effect.Effect<HttpClient.Service, E, R>
) => Layer<HttpClient.Service, E, R> = internal.layerMergedContext
