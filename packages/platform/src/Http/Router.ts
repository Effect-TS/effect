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
  export type ExcludeProvided<A> = Exclude<
    A,
    RouteContext | ServerRequest.ServerRequest | ServerRequest.ParsedSearchParams | Scope.Scope
  >
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
  readonly handler: Route.Handler<E, R>
  readonly prefix: Option.Option<string>
  readonly uninterruptible: boolean
}

/**
 * @since 1.0.0
 */
export declare namespace Route {
  /**
   * @since 1.0.0
   */
  export type Handler<E, R> = Effect.Effect<
    ServerResponse.ServerResponse,
    E,
    R | RouteContext | ServerRequest.ServerRequest | ServerRequest.ParsedSearchParams
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
export const schemaJson: <
  R,
  I extends Partial<{
    readonly method: Method.Method
    readonly url: string
    readonly cookies: Readonly<Record<string, string | undefined>>
    readonly headers: Readonly<Record<string, string | undefined>>
    readonly pathParams: Readonly<Record<string, string | undefined>>
    readonly searchParams: Readonly<Record<string, string | Array<string> | undefined>>
    readonly body: any
  }>,
  A
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<
  A,
  Error.RequestError | ParseResult.ParseError,
  RouteContext | R | ServerRequest.ServerRequest | ServerRequest.ParsedSearchParams
> = internal.schemaJson

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaNoBody: <
  R,
  I extends Partial<
    {
      readonly method: Method.Method
      readonly url: string
      readonly cookies: Readonly<Record<string, string | undefined>>
      readonly headers: Readonly<Record<string, string | undefined>>
      readonly pathParams: Readonly<Record<string, string | undefined>>
      readonly searchParams: Readonly<Record<string, string | Array<string> | undefined>>
    }
  >,
  A
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<
  A,
  ParseResult.ParseError,
  R | RouteContext | ServerRequest.ServerRequest | ServerRequest.ParsedSearchParams
> = internal.schemaNoBody

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaParams: <R, I extends Readonly<Record<string, string | Array<string> | undefined>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError, R | RouteContext | ServerRequest.ParsedSearchParams> =
  internal.schemaParams

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaPathParams: <R, I extends Readonly<Record<string, string | undefined>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError, R | RouteContext> = internal.schemaPathParams

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
export const makeRoute: <E, R>(
  method: Method.Method,
  path: PathInput,
  handler: Route.Handler<E, R>,
  prefix?: Option.Option<string>,
  uninterruptible?: boolean
) => Route<E, Router.ExcludeProvided<R>> = internal.makeRoute

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
    | Router.ExcludeProvided<R1>
    | Router.ExcludeProvided<R>
  >
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: `/${string}`,
    that: App.Default<E1, R1>,
    options?: { readonly includePrefix?: boolean | undefined } | undefined
  ): Router<
    E | E1,
    | Router.ExcludeProvided<R>
    | Router.ExcludeProvided<R1>
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
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): <R, E>(
    self: Router<E, R>
  ) => Router<E1 | E, R | Exclude<R1, ServerRequest.ServerRequest | RouteContext | Scope.Scope>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): Router<E | E1, R | Exclude<R1, ServerRequest.ServerRequest | RouteContext | Scope.Scope>>
} = internal.route

/**
 * @since 1.0.0
 * @category routing
 */
export const all: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): <R, E>(
    self: Router<E, R>
  ) => Router<
    E1 | E,
    R | Router.ExcludeProvided<R1>
  >
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): Router<
    E | E1,
    R | Router.ExcludeProvided<R1>
  >
} = internal.all

/**
 * @since 1.0.0
 * @category routing
 */
export const get: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): <R, E>(
    self: Router<E, R>
  ) => Router<E1 | E, R | Router.ExcludeProvided<R1>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): Router<E | E1, R | Router.ExcludeProvided<R1>>
} = internal.get

/**
 * @since 1.0.0
 * @category routing
 */
export const post: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): <R, E>(
    self: Router<E, R>
  ) => Router<E1 | E, R | Router.ExcludeProvided<R1>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): Router<E | E1, R | Router.ExcludeProvided<R1>>
} = internal.post

/**
 * @since 1.0.0
 * @category routing
 */
export const patch: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): <R, E>(
    self: Router<E, R>
  ) => Router<E1 | E, R | Router.ExcludeProvided<R1>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): Router<E | E1, R | Router.ExcludeProvided<R1>>
} = internal.patch

/**
 * @since 1.0.0
 * @category routing
 */
export const put: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): <R, E>(
    self: Router<E, R>
  ) => Router<E1 | E, R | Router.ExcludeProvided<R1>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): Router<E | E1, R | Router.ExcludeProvided<R1>>
} = internal.put

/**
 * @since 1.0.0
 * @category routing
 */
export const del: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): <R, E>(
    self: Router<E, R>
  ) => Router<E1 | E, R | Router.ExcludeProvided<R1>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): Router<E | E1, R | Router.ExcludeProvided<R1>>
} = internal.del

/**
 * @since 1.0.0
 * @category routing
 */
export const head: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): <R, E>(
    self: Router<E, R>
  ) => Router<E1 | E, R | Router.ExcludeProvided<R1>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): Router<E | E1, R | Router.ExcludeProvided<R1>>
} = internal.head

/**
 * @since 1.0.0
 * @category routing
 */
export const options: {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): <R, E>(
    self: Router<E, R>
  ) => Router<E1 | E, R | Router.ExcludeProvided<R1>>
  <R, E, R1, E1>(
    self: Router<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): Router<E | E1, R | Router.ExcludeProvided<R1>>
} = internal.options

/**
 * @since 1.0.0
 * @category combinators
 */
export const use: {
  <E, R, R1, E1>(
    f: (self: Route.Handler<E, R>) => App.Default<E1, R1>
  ): (self: Router<E, R>) => Router<E1, Router.ExcludeProvided<R1>>
  <E, R, R1, E1>(
    self: Router<E, R>,
    f: (self: Route.Handler<E, R>) => App.Default<E1, R1>
  ): Router<E1, Router.ExcludeProvided<R1>>
} = internal.use

/**
 * @since 1.0.0
 * @category combinators
 */
export const catchAll: {
  <E, E2, R2>(
    f: (e: E) => Route.Handler<E2, R2>
  ): <R>(self: Router<E, R>) => Router<E2, R | Router.ExcludeProvided<R2>>
  <R, E, E2, R2>(
    self: Router<E, R>,
    f: (e: E) => Route.Handler<E2, R2>
  ): Router<E2, R | Router.ExcludeProvided<R2>>
} = internal.catchAll

/**
 * @since 1.0.0
 * @category combinators
 */
export const catchAllCause: {
  <E, E2, R2>(
    f: (e: Cause.Cause<E>) => Route.Handler<E2, R2>
  ): <R>(self: Router<E, R>) => Router<E2, R | Router.ExcludeProvided<R2>>
  <R, E, E2, R2>(
    self: Router<E, R>,
    f: (e: Cause.Cause<E>) => Route.Handler<E2, R2>
  ): Router<E2, R | Router.ExcludeProvided<R2>>
} = internal.catchAllCause

/**
 * @since 1.0.0
 * @category combinators
 */
export const catchTag: {
  <K extends E extends { _tag: string } ? E["_tag"] : never, E, E1, R1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Route.Handler<E1, R1>
  ): <R>(
    self: Router<E, R>
  ) => Router<E1 | Exclude<E, { _tag: K }>, R | Router.ExcludeProvided<R1>>
  <R, E, K extends E extends { _tag: string } ? E["_tag"] : never, E1, R1>(
    self: Router<E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Route.Handler<E1, R1>
  ): Router<E1 | Exclude<E, { _tag: K }>, R | Router.ExcludeProvided<R1>>
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
    | Router.ExcludeProvided<
      {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer R> ? R : never
      }[keyof Cases]
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
    | Router.ExcludeProvided<
      {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer R> ? R : never
      }[keyof Cases]
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
    | Exclude<Router.ExcludeProvided<R1>, Context.Tag.Identifier<T>>
  >
  <R, E, T extends Context.Tag<any, any>, R1, E1>(
    self: Router<E, R>,
    tag: T,
    effect: Effect.Effect<Context.Tag.Service<T>, E1, R1>
  ): Router<
    E | E1,
    | Exclude<R, Context.Tag.Identifier<T>>
    | Exclude<Router.ExcludeProvided<R1>, Context.Tag.Identifier<T>>
  >
} = internal.provideServiceEffect
