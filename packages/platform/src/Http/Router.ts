/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Cause from "effect/Cause"
import type * as Chunk from "effect/Chunk"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import * as internal from "../internal/http/router.js"
import type * as App from "./App.js"
import type * as Method from "./Method.js"
import type * as Error from "./ServerError.js"
import type * as ServerRequest from "./ServerRequest.js"
import type * as ServerResponse from "./ServerResponse.js"

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
export interface Router<R, E> extends App.Default<Exclude<R, RouteContext>, E | Error.RouteNotFound> {
  readonly [TypeId]: TypeId
  readonly routes: Chunk.Chunk<Route<R, E>>
  readonly mounts: Chunk.Chunk<readonly [string, App.Default<R, E>]>
}

/**
 * @since 1.0.0
 */
export declare namespace Router {
  /**
   * @since 1.0.0
   */
  export type ExcludeProvided<A> = Exclude<A, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const RouteTypeId: unique symbol = internal.RouteTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type RouteTypeId = typeof RouteTypeId

/**
 * @since 1.0.0
 * @category models
 */
export type PathInput = `/${string}` | "*"

/**
 * @since 1.0.0
 * @category models
 */
export interface Route<R, E> {
  readonly [RouteTypeId]: RouteTypeId
  readonly method: Method.Method | "*"
  readonly path: PathInput
  readonly handler: Route.Handler<R, E>
  readonly prefix: Option.Option<string>
}

/**
 * @since 1.0.0
 */
export declare namespace Route {
  /**
   * @since 1.0.0
   */
  export type Handler<R, E> = Effect.Effect<
    R | RouteContext | ServerRequest.ServerRequest,
    E,
    ServerResponse.ServerResponse
  >
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const RouteContextTypeId: unique symbol = internal.RouteContextTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type RouteContextTypeId = typeof RouteContextTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface RouteContext {
  readonly [RouteContextTypeId]: RouteContextTypeId
  readonly params: Readonly<Record<string, string | undefined>>
  readonly searchParams: Readonly<Record<string, string>>
}

/**
 * @since 1.0.0
 * @category route context
 */
export const RouteContext: Context.Tag<RouteContext, RouteContext> = internal.RouteContext

/**
 * @since 1.0.0
 * @category route context
 */
export const params: Effect.Effect<
  RouteContext,
  never,
  Readonly<Record<string, string | undefined>>
> = internal.params

/**
 * @since 1.0.0
 * @category route context
 */
export const searchParams: Effect.Effect<
  RouteContext,
  never,
  Readonly<Record<string, string>>
> = internal.searchParams

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaParams: <I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<I, A>
) => Effect.Effect<RouteContext, ParseResult.ParseError, A> = internal.schemaParams

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaPathParams: <I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<I, A>
) => Effect.Effect<RouteContext, ParseResult.ParseError, A> = internal.schemaPathParams

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaSearchParams: <I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<I, A>
) => Effect.Effect<RouteContext, ParseResult.ParseError, A> = internal.schemaSearchParams

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Router<never, never> = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromIterable: <R, E>(
  routes: Iterable<Route<R, E>>
) => Router<R, E> = internal.fromIterable

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeRoute: <R, E>(
  method: Method.Method,
  path: PathInput,
  handler: Route.Handler<R, E>,
  prefix?: Option.Option<string>
) => Route<Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>, E> = internal.makeRoute

/**
 * @since 1.0.0
 * @category combinators
 */
export const prefixAll: {
  (prefix: PathInput): <R, E>(self: Router<R, E>) => Router<R, E>
  <R, E>(self: Router<R, E>, prefix: PathInput): Router<R, E>
} = internal.prefixAll

/**
 * @since 1.0.0
 * @category combinators
 */
export const concat: {
  <R1, E1>(that: Router<R1, E1>): <R, E>(
    self: Router<R, E>
  ) => Router<R1 | R, E1 | E>
  <R, E, R1, E1>(self: Router<R, E>, that: Router<R1, E1>): Router<
    R | R1,
    E | E1
  >
} = internal.concat

/**
 * @since 1.0.0
 * @category routing
 */
export const mount: {
  <R1, E1>(path: `/${string}`, that: Router<R1, E1>): <R, E>(self: Router<R, E>) => Router<R1 | R, E1 | E>
  <R, E, R1, E1>(self: Router<R, E>, path: `/${string}`, that: Router<R1, E1>): Router<R | R1, E | E1>
} = internal.mount

/**
 * @since 1.0.0
 * @category routing
 */
export const mountApp: {
  <R1, E1>(
    path: `/${string}`,
    that: App.Default<R1, E1>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | E
  >
  <R, E, R1, E1>(
    self: Router<R, E>,
    path: `/${string}`,
    that: App.Default<R1, E1>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E | E1
  >
} = internal.mountApp

/**
 * @since 1.0.0
 * @category routing
 */
export const route: (
  method: Method.Method | "*"
) => {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | E
  >
  <R, E, R1, E1>(
    self: Router<R, E>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E | E1
  >
} = internal.route

/**
 * @since 1.0.0
 * @category routing
 */
export const all: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | E
  >
  <R, E, R1, E1>(
    self: Router<R, E>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E | E1
  >
} = internal.all

/**
 * @since 1.0.0
 * @category routing
 */
export const get: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | E
  >
  <R, E, R1, E1>(
    self: Router<R, E>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E | E1
  >
} = internal.get

/**
 * @since 1.0.0
 * @category routing
 */
export const post: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | E
  >
  <R, E, R1, E1>(
    self: Router<R, E>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E | E1
  >
} = internal.post

/**
 * @since 1.0.0
 * @category routing
 */
export const patch: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | E
  >
  <R, E, R1, E1>(
    self: Router<R, E>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E | E1
  >
} = internal.patch

/**
 * @since 1.0.0
 * @category routing
 */
export const put: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | E
  >
  <R, E, R1, E1>(
    self: Router<R, E>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E | E1
  >
} = internal.put

/**
 * @since 1.0.0
 * @category routing
 */
export const del: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | E
  >
  <R, E, R1, E1>(
    self: Router<R, E>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E | E1
  >
} = internal.del

/**
 * @since 1.0.0
 * @category routing
 */
export const head: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | E
  >
  <R, E, R1, E1>(
    self: Router<R, E>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E | E1
  >
} = internal.head

/**
 * @since 1.0.0
 * @category routing
 */
export const options: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | E
  >
  <R, E, R1, E1>(
    self: Router<R, E>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E | E1
  >
} = internal.options

/**
 * @since 1.0.0
 * @category combinators
 */
export const use: {
  <R, E, R1, E1>(
    f: (self: Route.Handler<R, E>) => App.Default<R1, E1>
  ): (self: Router<R, E>) => Router<Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>, E1>
  <R, E, R1, E1>(
    self: Router<R, E>,
    f: (self: Route.Handler<R, E>) => App.Default<R1, E1>
  ): Router<Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>, E1>
} = internal.use

/**
 * @since 1.0.0
 * @category combinators
 */
export const catchAll: {
  <E, R2, E2>(
    f: (e: E) => Route.Handler<R2, E2>
  ): <R>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R2, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E2
  >
  <R, E, R2, E2>(
    self: Router<R, E>,
    f: (e: E) => Route.Handler<R2, E2>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R2, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E2
  >
} = internal.catchAll

/**
 * @since 1.0.0
 * @category combinators
 */
export const catchAllCause: {
  <E, R2, E2>(
    f: (e: Cause.Cause<E>) => Route.Handler<R2, E2>
  ): <R>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R2, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E2
  >
  <R, E, R2, E2>(
    self: Router<R, E>,
    f: (e: Cause.Cause<E>) => Route.Handler<R2, E2>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R2, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E2
  >
} = internal.catchAllCause

/**
 * @since 1.0.0
 * @category combinators
 */
export const catchTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, R1, E1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Route.Handler<R1, E1>
  ): <R>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | Exclude<E, { _tag: K }>
  >
  <R, E, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1>(
    self: Router<R, E>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Route.Handler<R1, E1>
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | Exclude<E, { _tag: K }>
  >
} = internal.catchTag

/**
 * @since 1.0.0
 * @category combinators
 */
export const catchTags: {
  <
    E,
    Cases extends E extends { _tag: string }
      ? { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Route.Handler<any, any>) | undefined }
      : {}
  >(
    cases: Cases
  ): <R>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<
      {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<infer R, any, any> ? R : never
      }[keyof Cases],
      RouteContext | ServerRequest.ServerRequest | Scope.Scope
    >,
    | Exclude<E, {
      /**
       * @since 1.0.0
       * @category combinators
       */
      _tag: keyof Cases
    }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never
    }[keyof Cases]
  >
  <
    R,
    E,
    Cases extends E extends { _tag: string }
      ? { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Route.Handler<any, any>) | undefined } :
      {}
  >(
    self: Router<R, E>,
    cases: Cases
  ): Router<
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<
      {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<infer R, any, any> ? R : never
      }[keyof Cases],
      RouteContext | ServerRequest.ServerRequest | Scope.Scope
    >,
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never
    }[keyof Cases]
  >
} = internal.catchTags

/**
 * @since 1.0.0
 * @category combinators
 */
export const provideService: {
  <T extends Context.Tag<any, any>>(
    tag: T,
    service: Context.Tag.Service<T>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    Exclude<Exclude<R, Context.Tag.Identifier<T>>, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E
  >
  <R, E, T extends Context.Tag<any, any>>(
    self: Router<R, E>,
    tag: T,
    service: Context.Tag.Service<T>
  ): Router<Exclude<Exclude<R, Context.Tag.Identifier<T>>, RouteContext | ServerRequest.ServerRequest | Scope.Scope>, E>
} = internal.provideService

/**
 * @since 1.0.0
 * @category combinators
 */
export const provideServiceEffect: {
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    effect: Effect.Effect<R1, E1, Context.Tag.Service<T>>
  ): <R, E>(
    self: Router<R, E>
  ) => Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<Exclude<R, Context.Tag.Identifier<T>>, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E1 | E
  >
  <R, E, T extends Context.Tag<any, any>, R1, E1>(
    self: Router<R, E>,
    tag: T,
    effect: Effect.Effect<R1, E1, Context.Tag.Service<T>>
  ): Router<
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<Exclude<R, Context.Tag.Identifier<T>>, RouteContext | ServerRequest.ServerRequest | Scope.Scope>,
    E | E1
  >
} = internal.provideServiceEffect
