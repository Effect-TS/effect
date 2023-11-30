/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type { Pipeable } from "effect/Pipeable"
import type * as Predicate from "effect/Predicate"
import type * as Schedule from "effect/Schedule"
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
export interface Client<R, E, A> extends Pipeable {
  (request: ClientRequest.ClientRequest): Effect.Effect<R, E, A>
  readonly [TypeId]: TypeId
  readonly preprocess: Client.Preprocess<R, E>
  readonly execute: Client.Execute<R, E, A>
}

/**
 * @since 1.0.0
 */
export declare namespace Client {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Preprocess<R, E> = (
    request: ClientRequest.ClientRequest
  ) => Effect.Effect<R, E, ClientRequest.ClientRequest>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Execute<R, E, A> = (
    request: Effect.Effect<R, E, ClientRequest.ClientRequest>
  ) => Effect.Effect<R, E, A>

  /**
   * @since 1.0.0
   * @category models
   */
  export type WithResponse<R, E> = Client<R, E, ClientResponse.ClientResponse>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Default = WithResponse<never, Error.HttpClientError>
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
export const layer: Layer.Layer<never, never, Client.Default> = internal.layer

/**
 * @since 1.0.0
 * @category constructors
 */
export const fetch: (options?: RequestInit) => Client.Default = internal.fetch

/**
 * @since 1.0.0
 * @category constructors
 */
export const fetchOk: (options?: RequestInit) => Client.Default = internal.fetchOk

/**
 * @since 1.0.0
 * @category error handling
 */
export const catchAll: {
  <E, R2, E2, A2>(f: (e: E) => Effect.Effect<R2, E2, A2>): <R, A>(self: Client<R, E, A>) => Client<R2 | R, E2, A2 | A>
  <R, E, A, R2, E2, A2>(self: Client<R, E, A>, f: (e: E) => Effect.Effect<R2, E2, A2>): Client<R | R2, E2, A | A2>
} = internal.catchAll

/**
 * @since 1.0.0
 * @category error handling
 */
export const catchTag: {
  <E extends { _tag: string }, K extends E["_tag"] & string, R1, E1, A1>(
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
  ): <R, A>(self: Client<R, E, A>) => Client<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A>
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string, E1, R1, A1>(
    self: Client<R, E, A>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect.Effect<R1, E1, A1>
  ): Client<R | R1, E1 | Exclude<E, { _tag: K }>, A | A1>
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
  ): <R, A>(
    self: Client<R, E, A>
  ) => Client<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<infer R, any, any> ? R : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer A> ? A : never
    }[keyof Cases]
  >
  <
    R,
    E extends { _tag: string },
    A,
    Cases extends { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Effect.Effect<any, any, any>) | undefined }
  >(
    self: Client<R, E, A>,
    cases: Cases
  ): Client<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<infer R, any, any> ? R : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer A> ? A : never
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
    orElse: (a: A) => Effect.Effect<R2, E2, B>
  ): <R, E>(self: Client<R, E, A>) => Client<R2 | R, E2 | E, A | B>
  <R, E, A, R2, E2, B>(
    self: Client<R, E, A>,
    f: Predicate.Predicate<A>,
    orElse: (a: A) => Effect.Effect<R2, E2, B>
  ): Client<R | R2, E | E2, A | B>
} = internal.filterOrElse

/**
 * @since 1.0.0
 * @category filters
 */
export const filterOrFail: {
  <A, E2>(f: Predicate.Predicate<A>, orFailWith: (a: A) => E2): <R, E>(self: Client<R, E, A>) => Client<R, E2 | E, A>
  <R, E, A, E2>(self: Client<R, E, A>, f: Predicate.Predicate<A>, orFailWith: (a: A) => E2): Client<R, E | E2, A>
} = internal.filterOrFail

/**
 * @since 1.0.0
 * @category filters
 */
export const filterStatus: {
  (
    f: (status: number) => boolean
  ): <R, E>(self: Client.WithResponse<R, E>) => Client.WithResponse<R, E | Error.ResponseError>
  <R, E>(
    self: Client.WithResponse<R, E>,
    f: (status: number) => boolean
  ): Client.WithResponse<R, Error.ResponseError | E>
} = internal.filterStatus

/**
 * @since 1.0.0
 * @category filters
 */
export const filterStatusOk: <R, E>(
  self: Client.WithResponse<R, E>
) => Client.WithResponse<R, Error.ResponseError | E> = internal.filterStatusOk

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <R, E, A, R2, E2>(
  execute: (request: Effect.Effect<R2, E2, ClientRequest.ClientRequest>) => Effect.Effect<R, E, A>,
  preprocess: Client.Preprocess<R2, E2>
) => Client<R, E, A> = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeDefault: (
  f: (
    request: ClientRequest.ClientRequest
  ) => Effect.Effect<never, Error.HttpClientError, ClientResponse.ClientResponse>
) => Client.Default = internal.makeDefault

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const transform: {
  <R, E, A, R1, E1, A1>(
    f: (effect: Effect.Effect<R, E, A>, request: ClientRequest.ClientRequest) => Effect.Effect<R1, E1, A1>
  ): (self: Client<R, E, A>) => Client<R | R1, E | E1, A1>
  <R, E, A, R1, E1, A1>(
    self: Client<R, E, A>,
    f: (effect: Effect.Effect<R, E, A>, request: ClientRequest.ClientRequest) => Effect.Effect<R1, E1, A1>
  ): Client<R | R1, E | E1, A1>
} = internal.transform

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const transformResponse: {
  <R, E, A, R1, E1, A1>(
    f: (effect: Effect.Effect<R, E, A>) => Effect.Effect<R1, E1, A1>
  ): (self: Client<R, E, A>) => Client<R1, E1, A1>
  <R, E, A, R1, E1, A1>(
    self: Client<R, E, A>,
    f: (effect: Effect.Effect<R, E, A>) => Effect.Effect<R1, E1, A1>
  ): Client<R1, E1, A1>
} = internal.transformResponse

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const map: {
  <A, B>(f: (a: A) => B): <R, E>(self: Client<R, E, A>) => Client<R, E, B>
  <R, E, A, B>(self: Client<R, E, A>, f: (a: A) => B): Client<R, E, B>
} = internal.map

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapEffect: {
  <A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>): <R, E>(self: Client<R, E, A>) => Client<R2 | R, E2 | E, B>
  <R, E, A, R2, E2, B>(self: Client<R, E, A>, f: (a: A) => Effect.Effect<R2, E2, B>): Client<R | R2, E | E2, B>
} = internal.mapEffect

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapRequest: {
  (
    f: (a: ClientRequest.ClientRequest) => ClientRequest.ClientRequest
  ): <R, E, A>(self: Client<R, E, A>) => Client<R, E, A>
  <R, E, A>(self: Client<R, E, A>, f: (a: ClientRequest.ClientRequest) => ClientRequest.ClientRequest): Client<R, E, A>
} = internal.mapRequest

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapRequestEffect: {
  <R2, E2>(
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<R2, E2, ClientRequest.ClientRequest>
  ): <R, E, A>(self: Client<R, E, A>) => Client<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(
    self: Client<R, E, A>,
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<R2, E2, ClientRequest.ClientRequest>
  ): Client<R | R2, E | E2, A>
} = internal.mapRequestEffect

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapInputRequest: {
  (
    f: (a: ClientRequest.ClientRequest) => ClientRequest.ClientRequest
  ): <R, E, A>(self: Client<R, E, A>) => Client<R, E, A>
  <R, E, A>(self: Client<R, E, A>, f: (a: ClientRequest.ClientRequest) => ClientRequest.ClientRequest): Client<R, E, A>
} = internal.mapInputRequest

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const mapInputRequestEffect: {
  <R2, E2>(
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<R2, E2, ClientRequest.ClientRequest>
  ): <R, E, A>(self: Client<R, E, A>) => Client<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(
    self: Client<R, E, A>,
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<R2, E2, ClientRequest.ClientRequest>
  ): Client<R | R2, E | E2, A>
} = internal.mapInputRequestEffect

/**
 * @since 1.0.0
 * @category error handling
 */
export const retry: {
  <R1, E extends E0, E0, B>(policy: Schedule.Schedule<R1, E0, B>): <R, A>(self: Client<R, E, A>) => Client<R1 | R, E, A>
  <R, E extends E0, E0, A, R1, B>(self: Client<R, E, A>, policy: Schedule.Schedule<R1, E0, B>): Client<R | R1, E, A>
} = internal.retry

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaFunction: {
  <SI, SA>(
    schema: Schema.Schema<SI, SA>
  ): <R, E, A>(
    self: Client<R, E, A>
  ) => (
    request: ClientRequest.ClientRequest
  ) => (a: SA) => Effect.Effect<R, Error.RequestError | E | ParseResult.ParseError, A>
  <R, E, A, SI, SA>(
    self: Client<R, E, A>,
    schema: Schema.Schema<SI, SA>
  ): (
    request: ClientRequest.ClientRequest
  ) => (a: SA) => Effect.Effect<R, Error.RequestError | ParseResult.ParseError | E, A>
} = internal.schemaFunction

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const tap: {
  <A, R2, E2, _>(f: (a: A) => Effect.Effect<R2, E2, _>): <R, E>(self: Client<R, E, A>) => Client<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, _>(self: Client<R, E, A>, f: (a: A) => Effect.Effect<R2, E2, _>): Client<R | R2, E | E2, A>
} = internal.tap

/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export const tapRequest: {
  <R2, E2, _>(
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<R2, E2, _>
  ): <R, E, A>(self: Client<R, E, A>) => Client<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, _>(
    self: Client<R, E, A>,
    f: (a: ClientRequest.ClientRequest) => Effect.Effect<R2, E2, _>
  ): Client<R | R2, E | E2, A>
} = internal.tapRequest
