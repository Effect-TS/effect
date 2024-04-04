/**
 * @since 1.0.0
 */
import type { Cookies } from "@effect/platform/Http/Cookies"
import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { RuntimeFiber } from "effect/Fiber"
import type * as FiberRef from "effect/FiberRef"
import type { Inspectable } from "effect/Inspectable"
import type * as Layer from "effect/Layer"
import type { Pipeable } from "effect/Pipeable"
import type * as Predicate from "effect/Predicate"
import type { Ref } from "effect/Ref"
import type * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as internal from "../internal/http/client.js"
import type * as Error from "./ClientError.js"
import type * as ClientRequest from "./ClientRequest.js"
import type * as ClientResponse from "./ClientResponse.js"

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
export interface Client<A = ClientResponse.ClientResponse, E = never, R = never> extends Pipeable, Inspectable {
  (request: ClientRequest.ClientRequest): Effect.Effect<A, E, R>
  readonly [TypeId]: TypeId
  readonly preprocess: Client.Preprocess<E, R>
  readonly execute: Client.Execute<A, E, R>
}

/**
 * @since 1.0.0
 */
export declare namespace Client {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Preprocess<E, R> = (
    request: ClientRequest.ClientRequest
  ) => Effect.Effect<ClientRequest.ClientRequest, E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Execute<A, E = never, R = never> = (
    request: Effect.Effect<ClientRequest.ClientRequest, E, R>
  ) => Effect.Effect<A, E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type WithResponse<E = never, R = never> = Client<ClientResponse.ClientResponse, E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Default = WithResponse<Error.HttpClientError, Scope.Scope>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Fetch {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Client: Context.Tag<Client.Default, Client.Default> = internal.tag

/**
 * @since 1.0.0
 * @category tags
 */
export const Fetch: Context.Tag<Fetch, typeof globalThis.fetch> = internal.Fetch

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Client.Default> = internal.layer

/**
 * @since 1.0.0
 * @category constructors
 */
export const fetch: Client.Default = internal.fetch

/**
 * @since 1.0.0
 * @category constructors
 */
export const fetchOk: Client.Default = internal.fetchOk

/**
 * @since 1.0.0
 * @category error handling
 */
export const catchAll: {
  <E, R2, E2, A2>(f: (e: E) => Effect.Effect<A2, E2, R2>): <A, R>(self: Client<A, E, R>) => Client<A2 | A, E2, R2 | R>
  <A, E, R, R2, E2, A2>(self: Client<A, E, R>, f: (e: E) => Effect.Effect<A2, E2, R2>): Client<A | A2, E2, R | R2>
} = internal.catchAll

/**
 * @since 1.0.0
 * @category error handling
 */
export const catchTag: {
  <E extends { _tag: string }, K extends E["_tag"] & string, R1, E1, A1>(
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<A1, E1, R1>
  ): <A, R>(self: Client<A, E, R>) => Client<A1 | A, E1 | Exclude<E, { _tag: K }>, R1 | R>
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string, E1, R1, A1>(
    self: Client<A, E, R>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<A1, E1, R1>
  ): Client<A | A1, E1 | Exclude<E, { _tag: K }>, R | R1>
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
    self: Client<A, E, R>
  ) => Client<
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
    self: Client<A, E, R>,
    cases: Cases
  ): Client<
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
 * @since 1.0.0
 * @category filters
 */
export const filterOrElse: {
  <A, R2, E2, B>(
    f: Predicate.Predicate<A>,
    orElse: (a: A) => Effect.Effect<B, E2, R2>
  ): <E, R>(self: Client<A, E, R>) => Client<A | B, E2 | E, R2 | R>
  <A, E, R, R2, E2, B>(
    self: Client<A, E, R>,
    f: Predicate.Predicate<A>,
    orElse: (a: A) => Effect.Effect<B, E2, R2>
  ): Client<A | B, E | E2, R | R2>
} = internal.filterOrElse

/**
 * @since 1.0.0
 * @category filters
 */
export const filterOrFail: {
  <A, E2>(f: Predicate.Predicate<A>, orFailWith: (a: A) => E2): <E, R>(self: Client<A, E, R>) => Client<A, E2 | E, R>
  <A, E, R, E2>(self: Client<A, E, R>, f: Predicate.Predicate<A>, orFailWith: (a: A) => E2): Client<A, E | E2, R>
} = internal.filterOrFail

/**
 * @since 1.0.0
 * @category filters
 */
export const filterStatus: {
  (
    f: (status: number) => boolean
  ): <E, R>(self: Client.WithResponse<E, R>) => Client.WithResponse<E | Error.ResponseError, R>
  <E, R>(
    self: Client.WithResponse<E, R>,
    f: (status: number) => boolean
  ): Client.WithResponse<Error.ResponseError | E, R>
} = internal.filterStatus

/**
 * @since 1.0.0
 * @category filters
 */
export const filterStatusOk: <E, R>(
  self: Client.WithResponse<E, R>
) => Client.WithResponse<Error.ResponseError | E, R> = internal.filterStatusOk

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <A, E, R, R2, E2>(
  execute: (request: Effect.Effect<ClientRequest.ClientRequest, E2, R2>) => Effect.Effect<A, E, R>,
  preprocess: Client.Preprocess<E2, R2>
) => Client<A, E, R> = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeDefault: (
  f: (
    request: ClientRequest.ClientRequest,
    fiber: RuntimeFiber<ClientResponse.ClientResponse, Error.HttpClientError>
  ) => Effect.Effect<ClientResponse.ClientResponse, Error.HttpClientError, Scope.Scope>
) => Client.Default = internal.makeDefault

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const transform: {
  <A, E, R, R1, E1, A1>(
    f: (effect: Effect.Effect<A, E, R>, request: ClientRequest.ClientRequest) => Effect.Effect<A1, E1, R1>
  ): (self: Client<A, E, R>) => Client<A1, E | E1, R | R1>
  <A, E, R, R1, E1, A1>(
    self: Client<A, E, R>,
    f: (effect: Effect.Effect<A, E, R>, request: ClientRequest.ClientRequest) => Effect.Effect<A1, E1, R1>
  ): Client<A1, E | E1, R | R1>
} = internal.transform

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const transformResponse: {
  <A, E, R, R1, E1, A1>(
    f: (effect: Effect.Effect<A, E, R>) => Effect.Effect<A1, E1, R1>
  ): (self: Client<A, E, R>) => Client<A1, E1, R1>
  <A, E, R, R1, E1, A1>(
    self: Client<A, E, R>,
    f: (effect: Effect.Effect<A, E, R>) => Effect.Effect<A1, E1, R1>
  ): Client<A1, E1, R1>
} = internal.transformResponse

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const map: {
  <A, B>(f: (a: A) => B): <E, R>(self: Client<A, E, R>) => Client<B, E, R>
  <A, E, R, B>(self: Client<A, E, R>, f: (a: A) => B): Client<B, E, R>
} = internal.map

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapEffect: {
  <A, R2, E2, B>(f: (a: A) => Effect.Effect<B, E2, R2>): <E, R>(self: Client<A, E, R>) => Client<B, E2 | E, R2 | R>
  <A, E, R, R2, E2, B>(self: Client<A, E, R>, f: (a: A) => Effect.Effect<B, E2, R2>): Client<B, E | E2, R2 | R>
} = internal.mapEffect

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapEffectScoped: {
  <A, R2, E2, B>(
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): <E, R>(self: Client<A, E, R>) => Client<B, E2 | E, Exclude<R2, Scope.Scope> | Exclude<R, Scope.Scope>>
  <A, E, R, R2, E2, B>(
    self: Client<A, E, R>,
    f: (a: A) => Effect.Effect<B, E2, R2>
  ): Client<B, E | E2, Exclude<R2, Scope.Scope> | Exclude<R, Scope.Scope>>
} = internal.mapEffectScoped

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapRequest: {
  (
    f: (a: ClientRequest.ClientRequest) => ClientRequest.ClientRequest
  ): <A, E, R>(self: Client<A, E, R>) => Client<A, E, R>
  <A, E, R>(self: Client<A, E, R>, f: (a: ClientRequest.ClientRequest) => ClientRequest.ClientRequest): Client<A, E, R>
} = internal.mapRequest

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapRequestEffect: {
  <R2, E2>(
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<ClientRequest.ClientRequest, E2, R2>
  ): <A, E, R>(self: Client<A, E, R>) => Client<A, E2 | E, R2 | R>
  <A, E, R, R2, E2>(
    self: Client<A, E, R>,
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<ClientRequest.ClientRequest, E2, R2>
  ): Client<A, E | E2, R | R2>
} = internal.mapRequestEffect

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapInputRequest: {
  (
    f: (a: ClientRequest.ClientRequest) => ClientRequest.ClientRequest
  ): <A, E, R>(self: Client<A, E, R>) => Client<A, E, R>
  <A, E, R>(self: Client<A, E, R>, f: (a: ClientRequest.ClientRequest) => ClientRequest.ClientRequest): Client<A, E, R>
} = internal.mapInputRequest

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapInputRequestEffect: {
  <R2, E2>(
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<ClientRequest.ClientRequest, E2, R2>
  ): <A, E, R>(self: Client<A, E, R>) => Client<A, E2 | E, R2 | R>
  <A, E, R, R2, E2>(
    self: Client<A, E, R>,
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<ClientRequest.ClientRequest, E2, R2>
  ): Client<A, E | E2, R2 | R>
} = internal.mapInputRequestEffect

/**
 * @since 1.0.0
 * @category error handling
 */
export const retry: {
  <B, E extends E0, E0, R1>(policy: Schedule.Schedule<B, E0, R1>): <A, R>(self: Client<A, E, R>) => Client<A, E, R1 | R>
  <A, E extends E0, E0, R, R1, B>(self: Client<A, E, R>, policy: Schedule.Schedule<B, E0, R1>): Client<A, E, R1 | R>
} = internal.retry

/**
 * @since 1.0.0
 * @category resources & finalizers
 */
export const scoped: <A, E, R>(self: Client<A, E, R>) => Client<A, E, Exclude<R, Scope.Scope>> = internal.scoped

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaFunction: {
  <SA, SI, SR>(
    schema: Schema.Schema<SA, SI, SR>,
    options?: ParseOptions | undefined
  ): <A, E, R>(
    self: Client<A, E, R>
  ) => (
    request: ClientRequest.ClientRequest
  ) => (a: SA) => Effect.Effect<A, E | ParseResult.ParseError | Error.RequestError, SR | R>
  <A, E, R, SA, SI, SR>(
    self: Client<A, E, R>,
    schema: Schema.Schema<SA, SI, SR>,
    options?: ParseOptions | undefined
  ): (
    request: ClientRequest.ClientRequest
  ) => (a: SA) => Effect.Effect<A, ParseResult.ParseError | Error.RequestError | E, R | SR>
} = internal.schemaFunction

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const tap: {
  <A, R2, E2, _>(f: (a: A) => Effect.Effect<_, E2, R2>): <E, R>(self: Client<A, E, R>) => Client<A, E2 | E, R2 | R>
  <A, E, R, R2, E2, _>(self: Client<A, E, R>, f: (a: A) => Effect.Effect<_, E2, R2>): Client<A, E | E2, R2 | R>
} = internal.tap

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const tapRequest: {
  <R2, E2, _>(
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<_, E2, R2>
  ): <A, E, R>(self: Client<A, E, R>) => Client<A, E2 | E, R2 | R>
  <A, E, R, R2, E2, _>(
    self: Client<A, E, R>,
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<_, E2, R2>
  ): Client<A, E | E2, R | R2>
} = internal.tapRequest

/**
 * @since 1.0.0
 * @category cookies
 */
export const withCookiesRef: {
  (ref: Ref<Cookies>): <E, R>(self: Client.WithResponse<E, R>) => Client.WithResponse<E, R>
  <E, R>(self: Client.WithResponse<E, R>, ref: Ref<Cookies>): Client.WithResponse<E, R>
} = internal.withCookiesRef

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentTracerDisabledWhen: FiberRef.FiberRef<Predicate.Predicate<ClientRequest.ClientRequest>> =
  internal.currentTracerDisabledWhen

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withTracerDisabledWhen: {
  (
    predicate: Predicate.Predicate<ClientRequest.ClientRequest>
  ): <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <R, E, A>(
    effect: Effect.Effect<A, E, R>,
    predicate: Predicate.Predicate<ClientRequest.ClientRequest>
  ): Effect.Effect<A, E, R>
} = internal.withTracerDisabledWhen

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentFetchOptions: FiberRef.FiberRef<RequestInit> = internal.currentFetchOptions

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withFetchOptions: {
  (options: RequestInit): <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <R, E, A>(effect: Effect.Effect<A, E, R>, options: RequestInit): Effect.Effect<A, E, R>
} = internal.withFetchOptions
