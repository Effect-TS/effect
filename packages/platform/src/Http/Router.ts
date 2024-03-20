/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Cause from "effect/Cause"
import type * as Chunk from "effect/Chunk"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { Inspectable } from "effect/Inspectable"
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
export interface Router<E = never, R = never>
  extends App.Default<E | Error.RouteNotFound, Exclude<R, RouteContext>>, Inspectable
{
  readonly [TypeId]: TypeId
  readonly routes: Chunk.Chunk<Route<E, R>>
  readonly mounts: Chunk.Chunk<
    readonly [
      prefix: string,
      httpApp: App.Default<E, R>,
      options?: { readonly includePrefix?: boolean | undefined } | undefined
    ]
  >
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
export interface Route<E = never, R = never> extends Inspectable {
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
    ServerResponse.ServerResponse,
    E,
    R | RouteContext | ServerRequest.ServerRequest
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
  readonly route: Route<unknown, unknown>
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
  Readonly<Record<string, string | undefined>>,
  never,
  RouteContext
> = internal.params

/**
 * @since 1.0.0
 * @category route context
 */
export const searchParams: Effect.Effect<
  Readonly<Record<string, string>>,
  never,
  RouteContext
> = internal.searchParams

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaJson: <
  R,
  I extends Partial<
    {
      readonly method: Method.Method
      readonly url: string
      readonly cookies: Readonly<Record<string, string>>
      readonly headers: Readonly<Record<string, string>>
      readonly pathParams: Readonly<Record<string, string>>
      readonly searchParams: Readonly<Record<string, string>>
      readonly body: any
    }
  >,
  A
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, Error.RequestError | ParseResult.ParseError, RouteContext | R | ServerRequest.ServerRequest> =
  internal.schemaJson

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaNoBody: <
  R,
  I extends Partial<{
    readonly method: Method.Method
    readonly url: string
    readonly cookies: Readonly<Record<string, string>>
    readonly headers: Readonly<Record<string, string>>
    readonly pathParams: Readonly<Record<string, string>>
    readonly searchParams: Readonly<Record<string, string>>
  }>,
  A
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError, R | RouteContext | ServerRequest.ServerRequest> = internal.schemaNoBody

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaParams: <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError, RouteContext | R> = internal.schemaParams

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaPathParams: <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError, RouteContext | R> = internal.schemaPathParams

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaSearchParams: <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError, RouteContext | R> = internal.schemaSearchParams

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Router = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromIterable: <R extends Route<any, any>>(
  routes: Iterable<R>
) => Router<R extends Route<infer E, infer _> ? E : never, R extends Route<infer _, infer Env> ? Env : never> =
  internal.fromIterable

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeRoute: <R, E>(
  method: Method.Method,
  path: PathInput,
  handler: Route.Handler<R, E>,
  prefix?: Option.Option<string>
) => Route<E, Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>> = internal.makeRoute

/**
 * @since 1.0.0
 * @category combinators
 */
export const prefixAll: {
  (prefix: PathInput): <R, E>(self: Router<E, R>) => Router<E, R>
  <R, E>(self: Router<E, R>, prefix: PathInput): Router<E, R>
} = internal.prefixAll

/**
 * @since 1.0.0
 * @category combinators
 */
export const concat: {
  <R1, E1>(that: Router<E1, R1>): <R, E>(
    self: Router<E, R>
  ) => Router<E1 | E, R1 | R>
  <R, E, R1, E1>(self: Router<E, R>, that: Router<E1, R1>): Router<
    E | E1,
    R | R1
  >
} = internal.concat

/**
 * @since 1.0.0
 * @category routing
 */
export const mount: {
  <R1, E1>(path: `/${string}`, that: Router<E1, R1>): <R, E>(self: Router<E, R>) => Router<E1 | E, R1 | R>
  <R, E, R1, E1>(self: Router<E, R>, path: `/${string}`, that: Router<E1, R1>): Router<E | E1, R | R1>
} = internal.mount

/**
 * @since 1.0.0
 * @category routing
 */
export const mountApp: {
  <R1, E1>(
    path: `/${string}`,
    that: App.Default<E1, R1>,
    options?: { readonly includePrefix?: boolean | undefined } | undefined
  ): <R, E>(
    self: Router<E, R>
  ) => Router<
    E1 | E,
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
  >
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: `/${string}`,
    that: App.Default<E1, R1>,
    options?: { readonly includePrefix?: boolean | undefined } | undefined
  ): Router<
    E | E1,
    | Exclude<R, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
    | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>
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
    self: Router<E, R>
  ) => Router<E1 | E, R | Exclude<R1, ServerRequest.ServerRequest | RouteContext | Scope.Scope>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<E | E1, R | Exclude<R1, ServerRequest.ServerRequest | RouteContext | Scope.Scope>>
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
    self: Router<E, R>
  ) => Router<E1 | E, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<E | E1, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
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
    self: Router<E, R>
  ) => Router<E1 | E, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<E | E1, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
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
    self: Router<E, R>
  ) => Router<E1 | E, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<E | E1, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
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
    self: Router<E, R>
  ) => Router<E1 | E, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<E | E1, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
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
    self: Router<E, R>
  ) => Router<E1 | E, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<E | E1, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
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
    self: Router<E, R>
  ) => Router<E1 | E, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<E | E1, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
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
    self: Router<E, R>
  ) => Router<E1 | E, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<E | E1, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
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
    self: Router<E, R>
  ) => Router<E1 | E, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<R1, E1>
  ): Router<E | E1, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
} = internal.options

/**
 * @since 1.0.0
 * @category combinators
 */
export const use: {
  <R, E, R1, E1>(
    f: (self: Route.Handler<R, E>) => App.Default<E1, R1>
  ): (self: Router<E, R>) => Router<E1, Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    f: (self: Route.Handler<R, E>) => App.Default<E1, R1>
  ): Router<E1, Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
} = internal.use

/**
 * @since 1.0.0
 * @category combinators
 */
export const catchAll: {
  <E, R2, E2>(
    f: (e: E) => Route.Handler<R2, E2>
  ): <R>(self: Router<E, R>) => Router<E2, R | Exclude<R2, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, R2, E2>(
    self: Router<E, R>,
    f: (e: E) => Route.Handler<R2, E2>
  ): Router<E2, R | Exclude<R2, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
} = internal.catchAll

/**
 * @since 1.0.0
 * @category combinators
 */
export const catchAllCause: {
  <E, R2, E2>(
    f: (e: Cause.Cause<E>) => Route.Handler<R2, E2>
  ): <R>(self: Router<E, R>) => Router<E2, R | Exclude<R2, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, R2, E2>(
    self: Router<E, R>,
    f: (e: Cause.Cause<E>) => Route.Handler<R2, E2>
  ): Router<E2, R | Exclude<R2, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
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
    self: Router<E, R>
  ) => Router<E1 | Exclude<E, { _tag: K }>, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1>(
    self: Router<E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Route.Handler<R1, E1>
  ): Router<E1 | Exclude<E, { _tag: K }>, R | Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>>
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
    self: Router<E, R>
  ) => Router<
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | R
    | Exclude<
      {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer R> ? R : never
      }[keyof Cases],
      RouteContext | ServerRequest.ServerRequest | Scope.Scope
    >
  >
  <
    R,
    E,
    Cases extends E extends { _tag: string }
      ? { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Route.Handler<any, any>) | undefined } :
      {}
  >(
    self: Router<E, R>,
    cases: Cases
  ): Router<
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | R
    | Exclude<
      {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer R> ? R : never
      }[keyof Cases],
      RouteContext | ServerRequest.ServerRequest | Scope.Scope
    >
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
  ): <R, E>(self: Router<E, R>) => Router<E, Exclude<R, Context.Tag.Identifier<T>>>
  <R, E, T extends Context.Tag<any, any>>(
    self: Router<E, R>,
    tag: T,
    service: Context.Tag.Service<T>
  ): Router<E, Exclude<R, Context.Tag.Identifier<T>>>
} = internal.provideService

/**
 * @since 1.0.0
 * @category combinators
 */
export const provideServiceEffect: {
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    effect: Effect.Effect<Context.Tag.Service<T>, E1, R1>
  ): <R, E>(
    self: Router<E, R>
  ) => Router<
    E1 | E,
    | Exclude<R, Context.Tag.Identifier<T>>
    | Exclude<Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>, Context.Tag.Identifier<T>>
  >
  <R, E, T extends Context.Tag<any, any>, R1, E1>(
    self: Router<E, R>,
    tag: T,
    effect: Effect.Effect<Context.Tag.Service<T>, E1, R1>
  ): Router<
    E | E1,
    | Exclude<R, Context.Tag.Identifier<T>>
    | Exclude<Exclude<R1, RouteContext | ServerRequest.ServerRequest | Scope.Scope>, Context.Tag.Identifier<T>>
  >
} = internal.provideServiceEffect
