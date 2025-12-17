/**
 * @since 1.0.0
 */
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
import type { Scope } from "effect/Scope"
import type { NoExcessProperties, NoInfer } from "effect/Types"
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
export interface HttpClient extends HttpClient.With<Error.HttpClientError> {}

/**
 * @since 1.0.0
 */
export declare namespace HttpClient {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface With<E, R = never> extends Pipeable, Inspectable {
    readonly [TypeId]: TypeId
    readonly execute: (
      request: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>

    readonly get: (
      url: string | URL,
      options?: ClientRequest.Options.NoBody
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    readonly head: (
      url: string | URL,
      options?: ClientRequest.Options.NoBody
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    readonly post: (
      url: string | URL,
      options?: ClientRequest.Options.NoUrl
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    readonly patch: (
      url: string | URL,
      options?: ClientRequest.Options.NoUrl
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    readonly put: (
      url: string | URL,
      options?: ClientRequest.Options.NoUrl
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    readonly del: (
      url: string | URL,
      options?: ClientRequest.Options.NoUrl
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    readonly options: (
      url: string | URL,
      options?: ClientRequest.Options.NoUrl
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>
  }

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
  export type Postprocess<E = never, R = never> = (
    request: Effect.Effect<ClientRequest.HttpClientRequest, E, R>
  ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const HttpClient: Context.Tag<HttpClient, HttpClient> = internal.tag

/**
 * @since 1.0.0
 * @category accessors
 */
export const execute: (
  request: ClientRequest.HttpClientRequest
) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient> = internal.execute

/**
 * @since 1.0.0
 * @category accessors
 */
export const get: (
  url: string | URL,
  options?: ClientRequest.Options.NoBody | undefined
) => Effect.Effect<
  ClientResponse.HttpClientResponse,
  Error.HttpClientError,
  HttpClient
> = internal.get

/**
 * @since 1.0.0
 * @category accessors
 */
export const head: (
  url: string | URL,
  options?: ClientRequest.Options.NoBody | undefined
) => Effect.Effect<
  ClientResponse.HttpClientResponse,
  Error.HttpClientError,
  HttpClient
> = internal.head

/**
 * @since 1.0.0
 * @category accessors
 */
export const post: (
  url: string | URL,
  options?: ClientRequest.Options.NoUrl | undefined
) => Effect.Effect<
  ClientResponse.HttpClientResponse,
  Error.HttpClientError,
  HttpClient
> = internal.post

/**
 * @since 1.0.0
 * @category accessors
 */
export const patch: (
  url: string | URL,
  options?: ClientRequest.Options.NoUrl | undefined
) => Effect.Effect<
  ClientResponse.HttpClientResponse,
  Error.HttpClientError,
  HttpClient
> = internal.patch

/**
 * @since 1.0.0
 * @category accessors
 */
export const put: (
  url: string | URL,
  options?: ClientRequest.Options.NoUrl | undefined
) => Effect.Effect<
  ClientResponse.HttpClientResponse,
  Error.HttpClientError,
  HttpClient
> = internal.put

/**
 * @since 1.0.0
 * @category accessors
 */
export const del: (
  url: string | URL,
  options?: ClientRequest.Options.NoUrl | undefined
) => Effect.Effect<
  ClientResponse.HttpClientResponse,
  Error.HttpClientError,
  HttpClient
> = internal.del

/**
 * @since 1.0.0
 * @category accessors
 */
export const options: (
  url: string | URL,
  options?: ClientRequest.Options.NoUrl | undefined
) => Effect.Effect<
  ClientResponse.HttpClientResponse,
  Error.HttpClientError,
  HttpClient
> = internal.options

/**
 * @since 1.0.0
 * @category error handling
 */
export const catchAll: {
  <E, E2, R2>(
    f: (e: E) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E2, R2 | R>
  <E, R, A2, E2, R2>(
    self: HttpClient.With<E, R>,
    f: (e: E) => Effect.Effect<A2, E2, R2>
  ): HttpClient.With<E2, R | R2>
} = internal.catchAll

/**
 * @since 1.0.0
 * @category error handling
 */
export const catchTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, E1, R1>(
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E1 | Exclude<E, { _tag: K }>, R1 | R>
  <R, E, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1>(
    self: HttpClient.With<E, R>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): HttpClient.With<E1 | Exclude<E, { _tag: K }>, R1 | R>
} = internal.catchTag

/**
 * @since 1.0.0
 * @category error handling
 */
export const catchTags: {
  <
    E,
    Cases extends
      & {
        [K in Extract<E, { _tag: string }>["_tag"]]+?: (
          error: Extract<E, { _tag: K }>
        ) => Effect.Effect<ClientResponse.HttpClientResponse, any, any>
      }
      & (unknown extends E ? {} : { [K in Exclude<keyof Cases, Extract<E, { _tag: string }>["_tag"]>]: never })
  >(
    cases: Cases
  ): <R>(
    self: HttpClient.With<E, R>
  ) => HttpClient.With<
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
    E extends { _tag: string },
    R,
    Cases extends
      & {
        [K in Extract<E, { _tag: string }>["_tag"]]+?: (
          error: Extract<E, { _tag: K }>
        ) => Effect.Effect<ClientResponse.HttpClientResponse, any, any>
      }
      & (unknown extends E ? {} : { [K in Exclude<keyof Cases, Extract<E, { _tag: string }>["_tag"]>]: never })
  >(
    self: HttpClient.With<E, R>,
    cases: Cases
  ): HttpClient.With<
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
  <E2, R2>(
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orElse: (response: ClientResponse.HttpClientResponse) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E2 | E, R2 | R>
  <E, R, E2, R2>(
    self: HttpClient.With<E, R>,
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orElse: (response: ClientResponse.HttpClientResponse) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>
  ): HttpClient.With<E2 | E, R2 | R>
} = internal.filterOrElse

/**
 * Filters the result of a response, or throws an error if the predicate fails.
 *
 * @since 1.0.0
 * @category filters
 */
export const filterOrFail: {
  <E2>(
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orFailWith: (response: ClientResponse.HttpClientResponse) => E2
  ): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E2 | E, R>
  <E, R, E2>(
    self: HttpClient.With<E, R>,
    predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>,
    orFailWith: (response: ClientResponse.HttpClientResponse) => E2
  ): HttpClient.With<E2 | E, R>
} = internal.filterOrFail

/**
 * Filters responses by HTTP status code.
 *
 * @since 1.0.0
 * @category filters
 */
export const filterStatus: {
  (f: (status: number) => boolean): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | Error.ResponseError, R>
  <E, R>(self: HttpClient.With<E, R>, f: (status: number) => boolean): HttpClient.With<E | Error.ResponseError, R>
} = internal.filterStatus

/**
 * Filters responses that return a 2xx status code.
 *
 * @since 1.0.0
 * @category filters
 */
export const filterStatusOk: <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | Error.ResponseError, R> =
  internal.filterStatusOk

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWith: <E2, R2, E, R>(
  postprocess: (
    request: Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>,
  preprocess: HttpClient.Preprocess<E2, R2>
) => HttpClient.With<E, R> = internal.makeWith

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  f: (
    request: ClientRequest.HttpClientRequest,
    url: URL,
    signal: AbortSignal,
    fiber: RuntimeFiber<ClientResponse.HttpClientResponse, Error.HttpClientError>
  ) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError>
) => HttpClient = internal.make

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const transform: {
  <E, R, E1, R1>(
    f: (
      effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>,
      request: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): (self: HttpClient.With<E, R>) => HttpClient.With<E | E1, R | R1>
  <E, R, E1, R1>(
    self: HttpClient.With<E, R>,
    f: (
      effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>,
      request: ClientRequest.HttpClientRequest
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): HttpClient.With<E | E1, R | R1>
} = internal.transform

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const transformResponse: {
  <E, R, E1, R1>(
    f: (
      effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): (self: HttpClient.With<E, R>) => HttpClient.With<E1, R1>
  <E, R, E1, R1>(
    self: HttpClient.With<E, R>,
    f: (
      effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>
    ) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>
  ): HttpClient.With<E1, R1>
} = internal.transformResponse

/**
 * Appends a transformation of the request object before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapRequest: {
  (
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>
  <E, R>(
    self: HttpClient.With<E, R>,
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ): HttpClient.With<E, R>
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
  ): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2>
  <E, R, E2, R2>(
    self: HttpClient.With<E, R>,
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ): HttpClient.With<E | E2, R | R2>
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
  ): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>
  <E, R>(
    self: HttpClient.With<E, R>,
    f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest
  ): HttpClient.With<E, R>
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
  ): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2>
  <E, R, E2, R2>(
    self: HttpClient.With<E, R>,
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>
  ): HttpClient.With<E | E2, R | R2>
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
  export type Return<R, E, O extends NoExcessProperties<Effect.Retry.Options<E>, O>> = HttpClient.With<
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
  <E, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(
    options: O
  ): <R>(self: HttpClient.With<E, R>) => Retry.Return<R, E, O>
  <B, E, R1>(
    policy: Schedule.Schedule<B, NoInfer<E>, R1>
  ): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R1 | R>
  <E, R, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(
    self: HttpClient.With<E, R>,
    options: O
  ): Retry.Return<R, E, O>
  <E, R, B, R1>(
    self: HttpClient.With<E, R>,
    policy: Schedule.Schedule<B, E, R1>
  ): HttpClient.With<E, R1 | R>
} = internal.retry

/**
 * Retries common transient errors, such as rate limiting, timeouts or network issues.
 *
 * Specifying a `while` predicate allows you to consider other errors as
 * transient.
 *
 * @since 1.0.0
 * @category error handling
 */
export const retryTransient: {
  <
    B,
    E,
    R1 = never,
    const Mode extends "errors-only" | "response-only" | "both" = never,
    Input = "errors-only" extends Mode ? E
      : "response-only" extends Mode ? ClientResponse.HttpClientResponse
      : ClientResponse.HttpClientResponse | E
  >(
    options: {
      readonly mode?: Mode | undefined
      readonly while?: Predicate.Predicate<NoInfer<Input>>
      readonly schedule?: Schedule.Schedule<B, NoInfer<Input>, R1>
      readonly times?: number
    } | Schedule.Schedule<B, NoInfer<Input>, R1>
  ): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R1 | R>
  <
    E,
    R,
    B,
    R1 = never,
    const Mode extends "errors-only" | "response-only" | "both" = never,
    Input = "errors-only" extends Mode ? E
      : "response-only" extends Mode ? ClientResponse.HttpClientResponse
      : ClientResponse.HttpClientResponse | E
  >(
    self: HttpClient.With<E, R>,
    options: {
      readonly mode?: Mode | undefined
      readonly while?: Predicate.Predicate<NoInfer<Input>>
      readonly schedule?: Schedule.Schedule<B, NoInfer<Input>, R1>
      readonly times?: number
    } | Schedule.Schedule<B, NoInfer<Input>, R1>
  ): HttpClient.With<E, R1 | R>
} = internal.retryTransient

/**
 * Performs an additional effect after a successful request.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const tap: {
  <_, E2, R2>(
    f: (response: ClientResponse.HttpClientResponse) => Effect.Effect<_, E2, R2>
  ): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2>
  <E, R, _, E2, R2>(
    self: HttpClient.With<E, R>,
    f: (response: ClientResponse.HttpClientResponse) => Effect.Effect<_, E2, R2>
  ): HttpClient.With<E | E2, R | R2>
} = internal.tap

/**
 * Performs an additional effect after an unsuccessful request.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const tapError: {
  <_, E, E2, R2>(
    f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>
  ): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2>
  <E, R, _, E2, R2>(
    self: HttpClient.With<E, R>,
    f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>
  ): HttpClient.With<E | E2, R | R2>
} = internal.tapError

/**
 * Performs an additional effect on the request before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const tapRequest: {
  <_, E2, R2>(
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>
  ): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2>
  <E, R, _, E2, R2>(
    self: HttpClient.With<E, R>,
    f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>
  ): HttpClient.With<E | E2, R | R2>
} = internal.tapRequest

/**
 * Associates a `Ref` of cookies with the client for handling cookies across requests.
 *
 * @since 1.0.0
 * @category cookies
 */
export const withCookiesRef: {
  (ref: Ref<Cookies>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>
  <E, R>(self: HttpClient.With<E, R>, ref: Ref<Cookies>): HttpClient.With<E, R>
} = internal.withCookiesRef

/**
 * Follows HTTP redirects up to a specified number of times.
 *
 * @since 1.0.0
 * @category redirects
 */
export const followRedirects: {
  (maxRedirects?: number | undefined): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>
  <E, R>(self: HttpClient.With<E, R>, maxRedirects?: number | undefined): HttpClient.With<E, R>
} = internal.followRedirects

/**
 * @since 1.0.0
 * @category Tracing
 */
export const currentTracerDisabledWhen: FiberRef.FiberRef<Predicate.Predicate<ClientRequest.HttpClientRequest>> =
  internal.currentTracerDisabledWhen

/**
 * Disables tracing for specific requests based on a provided predicate.
 *
 * @since 1.0.0
 * @category Tracing
 */
export const withTracerDisabledWhen: {
  (
    predicate: Predicate.Predicate<ClientRequest.HttpClientRequest>
  ): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>
  <E, R>(
    self: HttpClient.With<E, R>,
    predicate: Predicate.Predicate<ClientRequest.HttpClientRequest>
  ): HttpClient.With<E, R>
} = internal.withTracerDisabledWhen

/**
 * @since 1.0.0
 * @category Tracing
 */
export const currentTracerPropagation: FiberRef.FiberRef<boolean> = internal.currentTracerPropagation

/**
 * Enables or disables tracing propagation for the request.
 *
 * @since 1.0.0
 * @category Tracing
 */
export const withTracerPropagation: {
  (enabled: boolean): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>
  <E, R>(self: HttpClient.With<E, R>, enabled: boolean): HttpClient.With<E, R>
} = internal.withTracerPropagation

/**
 * @since 1.0.0
 */
export const layerMergedContext: <E, R>(
  effect: Effect.Effect<HttpClient, E, R>
) => Layer<HttpClient, E, R> = internal.layerMergedContext

/**
 * @since 1.0.0
 * @category Tracing
 */
export interface SpanNameGenerator {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category Tracing
 */
export const SpanNameGenerator: Context.Reference<
  SpanNameGenerator,
  (request: ClientRequest.HttpClientRequest) => string
> = internal.SpanNameGenerator

/**
 * Customizes the span names for tracing.
 *
 * ```ts
 * import { FetchHttpClient, HttpClient } from "@effect/platform"
 * import { NodeRuntime } from "@effect/platform-node"
 * import { Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const client = (yield* HttpClient.HttpClient).pipe(
 *     // Customize the span names for this HttpClient
 *     HttpClient.withSpanNameGenerator(
 *       (request) => `http.client ${request.method} ${request.url}`
 *     )
 *   )
 *
 *   yield* client.get("https://jsonplaceholder.typicode.com/posts/1")
 * }).pipe(Effect.provide(FetchHttpClient.layer), NodeRuntime.runMain)
 * ```
 *
 * @since 1.0.0
 * @category Tracing
 */
export const withSpanNameGenerator: {
  (
    f: (request: ClientRequest.HttpClientRequest) => string
  ): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>
  <E, R>(self: HttpClient.With<E, R>, f: (request: ClientRequest.HttpClientRequest) => string): HttpClient.With<E, R>
} = internal.withSpanNameGenerator

/**
 * Ties the lifetime of the `HttpClientRequest` to a `Scope`.
 *
 * @since 1.0.0
 * @category Scope
 */
export const withScope: <E, R>(
  self: HttpClient.With<E, R>
) => HttpClient.With<E, R | Scope> = internal.withScope
