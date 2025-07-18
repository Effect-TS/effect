/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import type * as Chunk from "effect/Chunk"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { FiberRef } from "effect/FiberRef"
import type { Inspectable } from "effect/Inspectable"
import type * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import type * as ParseResult from "effect/ParseResult"
import type * as Schema from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import type * as Scope from "effect/Scope"
import type { RouterConfig } from "find-my-way-ts"
import type * as Etag from "./Etag.js"
import type { FileSystem } from "./FileSystem.js"
import type * as App from "./HttpApp.js"
import type * as Method from "./HttpMethod.js"
import type * as Middleware from "./HttpMiddleware.js"
import type * as Platform from "./HttpPlatform.js"
import type * as HttpServer from "./HttpServer.js"
import type * as Error from "./HttpServerError.js"
import type * as ServerRequest from "./HttpServerRequest.js"
import type * as Respondable from "./HttpServerRespondable.js"
import type * as ServerResponse from "./HttpServerResponse.js"
import * as internal from "./internal/httpRouter.js"
import type { Path } from "./Path.js"

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
export interface HttpRouter<E = never, R = never>
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
export declare namespace HttpRouter {
  /**
   * @since 1.0.0
   */
  export type Provided = RouteContext | ServerRequest.HttpServerRequest | ServerRequest.ParsedSearchParams | Scope.Scope

  /**
   * @since 1.0.0
   */
  export type ExcludeProvided<A> = Exclude<A, Provided>

  /**
   * @since 1.0.0
   */
  export interface Service<E, R> {
    readonly router: Effect.Effect<HttpRouter<E, R>>
    readonly addRoute: (route: Route<E, R>) => Effect.Effect<void>
    readonly all: (
      path: PathInput,
      handler: Route.Handler<E, R | Provided>,
      options?: { readonly uninterruptible?: boolean | undefined } | undefined
    ) => Effect.Effect<void>
    readonly get: (
      path: PathInput,
      handler: Route.Handler<E, R | Provided>,
      options?: { readonly uninterruptible?: boolean | undefined } | undefined
    ) => Effect.Effect<void>
    readonly post: (
      path: PathInput,
      handler: Route.Handler<E, R | Provided>,
      options?: { readonly uninterruptible?: boolean | undefined } | undefined
    ) => Effect.Effect<void>
    readonly put: (
      path: PathInput,
      handler: Route.Handler<E, R | Provided>,
      options?: { readonly uninterruptible?: boolean | undefined } | undefined
    ) => Effect.Effect<void>
    readonly patch: (
      path: PathInput,
      handler: Route.Handler<E, R | Provided>,
      options?: { readonly uninterruptible?: boolean | undefined } | undefined
    ) => Effect.Effect<void>
    readonly del: (
      path: PathInput,
      handler: Route.Handler<E, R | Provided>,
      options?: { readonly uninterruptible?: boolean | undefined } | undefined
    ) => Effect.Effect<void>
    readonly head: (
      path: PathInput,
      handler: Route.Handler<E, R | Provided>,
      options?: { readonly uninterruptible?: boolean | undefined } | undefined
    ) => Effect.Effect<void>
    readonly options: (
      path: PathInput,
      handler: Route.Handler<E, R | Provided>,
      options?: { readonly uninterruptible?: boolean | undefined } | undefined
    ) => Effect.Effect<void>
    readonly mount: (
      path: `/${string}`,
      router: HttpRouter<E, R>
    ) => Effect.Effect<void>
    readonly mountApp: (
      path: `/${string}`,
      router: App.Default<E, R>,
      options?: { readonly includePrefix?: boolean | undefined } | undefined
    ) => Effect.Effect<void>
    readonly concat: (router: HttpRouter<E, R>) => Effect.Effect<void>
  }

  /**
   * @since 1.0.0
   */
  export type DefaultServices = Platform.HttpPlatform | Etag.Generator | FileSystem | Path

  /**
   * @since 1.0.0
   */
  export interface TagClass<Self, Name extends string, E, R> extends Context.Tag<Self, Service<E, R>> {
    new(_: never): Context.TagClassShape<Name, Service<E, R>>
    readonly Live: Layer.Layer<Self>
    readonly router: Effect.Effect<HttpRouter<E, R>, never, Self>
    readonly use: <XA, XE, XR>(
      f: (router: Service<E, R>) => Effect.Effect<XA, XE, XR>
    ) => Layer.Layer<never, XE, Exclude<XR, Scope.Scope>>
    readonly unwrap: <XA, XE, XR>(f: (router: HttpRouter<E, R>) => Layer.Layer<XA, XE, XR>) => Layer.Layer<XA, XE, XR>
    readonly serve: <E = never, R = never>(
      middleware?: Middleware.HttpMiddleware.Applied<App.Default, E, R>
    ) => Layer.Layer<
      never,
      never,
      HttpServer.HttpServer | Exclude<R, ServerRequest.HttpServerRequest | Scope.Scope>
    >
  }
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
  readonly method: Method.HttpMethod | "*"
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
  export type Handler<E, R> = App.HttpApp<
    Respondable.Respondable,
    E,
    R | RouteContext | ServerRequest.ParsedSearchParams
  >

  /**
   * @since 1.0.0
   */
  export type Middleware<E, R> = App.HttpApp<
    ServerResponse.HttpServerResponse,
    E,
    R | RouteContext | ServerRequest.ParsedSearchParams
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
    readonly method: Method.HttpMethod
    readonly url: string
    readonly cookies: Readonly<Record<string, string | undefined>>
    readonly headers: Readonly<Record<string, string | undefined>>
    readonly pathParams: Readonly<Record<string, string | undefined>>
    readonly searchParams: Readonly<Record<string, string | ReadonlyArray<string> | undefined>>
    readonly body: any
  }>,
  A
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<
  A,
  Error.RequestError | ParseResult.ParseError,
  RouteContext | R | ServerRequest.HttpServerRequest | ServerRequest.ParsedSearchParams
> = internal.schemaJson

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaNoBody: <
  R,
  I extends Partial<
    {
      readonly method: Method.HttpMethod
      readonly url: string
      readonly cookies: Readonly<Record<string, string | undefined>>
      readonly headers: Readonly<Record<string, string | undefined>>
      readonly pathParams: Readonly<Record<string, string | undefined>>
      readonly searchParams: Readonly<Record<string, string | ReadonlyArray<string> | undefined>>
    }
  >,
  A
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<
  A,
  ParseResult.ParseError,
  R | RouteContext | ServerRequest.HttpServerRequest | ServerRequest.ParsedSearchParams
> = internal.schemaNoBody

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaParams: <A, I extends Readonly<Record<string, string | ReadonlyArray<string> | undefined>>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError, R | RouteContext | ServerRequest.ParsedSearchParams> =
  internal.schemaParams

/**
 * @since 1.0.0
 * @category route context
 */
export const schemaPathParams: <A, I extends Readonly<Record<string, string | undefined>>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => Effect.Effect<A, ParseResult.ParseError, R | RouteContext> = internal.schemaPathParams

/**
 * @since 1.0.0
 * @category router config
 */
export const currentRouterConfig: FiberRef<Partial<RouterConfig>> = internal.currentRouterConfig

/**
 * @since 1.0.0
 * @category router config
 */
export const withRouterConfig: {
  (config: Partial<RouterConfig>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(effect: Effect.Effect<A, E, R>, config: Partial<RouterConfig>): Effect.Effect<A, E, R>
} = internal.withRouterConfig

/**
 * @since 1.0.0
 * @category router config
 */
export const setRouterConfig: (config: Partial<RouterConfig>) => Layer.Layer<never> = internal.setRouterConfig

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: HttpRouter = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromIterable: <R extends Route<any, any>>(
  routes: Iterable<R>
) => HttpRouter<R extends Route<infer E, infer _> ? E : never, R extends Route<infer _, infer Env> ? Env : never> =
  internal.fromIterable

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeRoute: <E, R>(
  method: Method.HttpMethod | "*",
  path: PathInput,
  handler: Route.Handler<E, R>,
  options?: { readonly prefix?: string | undefined; readonly uninterruptible?: boolean | undefined } | undefined
) => Route<E, HttpRouter.ExcludeProvided<R>> = internal.makeRoute

/**
 * @since 1.0.0
 * @category utils
 */
export const prefixPath: {
  (prefix: string): (self: string) => string
  (self: string, prefix: string): string
} = internal.prefixPath

/**
 * @since 1.0.0
 * @category combinators
 */
export const prefixAll: {
  (prefix: PathInput): <E, R>(self: HttpRouter<E, R>) => HttpRouter<E, R>
  <E, R>(self: HttpRouter<E, R>, prefix: PathInput): HttpRouter<E, R>
} = internal.prefixAll

/**
 * @since 1.0.0
 * @category combinators
 */
export const append: {
  <R1, E1>(
    route: Route<E1, R1>
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<
    E1 | E,
    R | HttpRouter.ExcludeProvided<R1>
  >
  <E, R, E1, R1>(
    self: HttpRouter<E, R>,
    route: Route<E1, R1>
  ): HttpRouter<
    E | E1,
    R | HttpRouter.ExcludeProvided<R1>
  >
} = internal.append

/**
 * @since 1.0.0
 * @category combinators
 */
export const concat: {
  <R1, E1>(that: HttpRouter<E1, R1>): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<E1 | E, R1 | R>
  <E, R, R1, E1>(self: HttpRouter<E, R>, that: HttpRouter<E1, R1>): HttpRouter<
    E | E1,
    R | R1
  >
} = internal.concat

/**
 * @since 1.0.0
 * @category combinators
 */
export const concatAll: <Routers extends ReadonlyArray<HttpRouter<unknown, unknown>>>(
  ...routers: Routers
) => [Routers[number]] extends [HttpRouter<infer E, infer R>] ? HttpRouter<E, R> : never = internal.concatAll

/**
 * @since 1.0.0
 * @category routing
 */
export const mount: {
  <R1, E1>(path: `/${string}`, that: HttpRouter<E1, R1>): <E, R>(self: HttpRouter<E, R>) => HttpRouter<E1 | E, R1 | R>
  <E, R, E1, R1>(self: HttpRouter<E, R>, path: `/${string}`, that: HttpRouter<E1, R1>): HttpRouter<E | E1, R | R1>
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
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<
    E1 | E,
    | HttpRouter.ExcludeProvided<R1>
    | HttpRouter.ExcludeProvided<R>
  >
  <E, R, E1, R1>(
    self: HttpRouter<E, R>,
    path: `/${string}`,
    that: App.Default<E1, R1>,
    options?: { readonly includePrefix?: boolean | undefined } | undefined
  ): HttpRouter<
    E | E1,
    | HttpRouter.ExcludeProvided<R>
    | HttpRouter.ExcludeProvided<R1>
  >
} = internal.mountApp

/**
 * @since 1.0.0
 * @category routing
 */
export const route: (
  method: Method.HttpMethod | "*"
) => {
  <R1, E1>(
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<E1 | E, R | Exclude<R1, ServerRequest.HttpServerRequest | RouteContext | Scope.Scope>>
  <E, R, E1, R1>(
    self: HttpRouter<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): HttpRouter<E | E1, R | Exclude<R1, ServerRequest.HttpServerRequest | RouteContext | Scope.Scope>>
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
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<
    E1 | E,
    R | HttpRouter.ExcludeProvided<R1>
  >
  <E, R, E1, R1>(
    self: HttpRouter<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): HttpRouter<
    E | E1,
    R | HttpRouter.ExcludeProvided<R1>
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
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<E1 | E, R | HttpRouter.ExcludeProvided<R1>>
  <E, R, E1, R1>(
    self: HttpRouter<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): HttpRouter<E | E1, R | HttpRouter.ExcludeProvided<R1>>
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
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<E1 | E, R | HttpRouter.ExcludeProvided<R1>>
  <E, R, E1, R1>(
    self: HttpRouter<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): HttpRouter<E | E1, R | HttpRouter.ExcludeProvided<R1>>
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
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<E1 | E, R | HttpRouter.ExcludeProvided<R1>>
  <E, R, E1, R1>(
    self: HttpRouter<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): HttpRouter<E | E1, R | HttpRouter.ExcludeProvided<R1>>
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
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<E1 | E, R | HttpRouter.ExcludeProvided<R1>>
  <E, R, E1, R1>(
    self: HttpRouter<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): HttpRouter<E | E1, R | HttpRouter.ExcludeProvided<R1>>
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
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<E1 | E, R | HttpRouter.ExcludeProvided<R1>>
  <E, R, E1, R1>(
    self: HttpRouter<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): HttpRouter<E | E1, R | HttpRouter.ExcludeProvided<R1>>
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
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<E1 | E, R | HttpRouter.ExcludeProvided<R1>>
  <E, R, E1, R1>(
    self: HttpRouter<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): HttpRouter<E | E1, R | HttpRouter.ExcludeProvided<R1>>
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
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<E1 | E, R | HttpRouter.ExcludeProvided<R1>>
  <E, R, E1, R1>(
    self: HttpRouter<E, R>,
    path: PathInput,
    handler: Route.Handler<E1, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ): HttpRouter<E | E1, R | HttpRouter.ExcludeProvided<R1>>
} = internal.options

/**
 * @since 1.0.0
 * @category combinators
 */
export const use: {
  <E, R, R1, E1>(
    f: (self: Route.Middleware<E, R>) => App.Default<E1, R1>
  ): (self: HttpRouter<E, R>) => HttpRouter<E1, HttpRouter.ExcludeProvided<R1>>
  <E, R, R1, E1>(
    self: HttpRouter<E, R>,
    f: (self: Route.Middleware<E, R>) => App.Default<E1, R1>
  ): HttpRouter<E1, HttpRouter.ExcludeProvided<R1>>
} = internal.use

/**
 * @since 1.0.0
 * @category combinators
 */
export const transform: {
  <E, R, R1, E1>(
    f: (self: Route.Handler<E, R>) => App.HttpApp<Respondable.Respondable, E1, R1>
  ): (self: HttpRouter<E, R>) => HttpRouter<E1, HttpRouter.ExcludeProvided<R1>>
  <E, R, R1, E1>(
    self: HttpRouter<E, R>,
    f: (self: Route.Handler<E, R>) => App.HttpApp<Respondable.Respondable, E1, R1>
  ): HttpRouter<E1, HttpRouter.ExcludeProvided<R1>>
} = internal.transform

/**
 * @since 1.0.0
 * @category combinators
 */
export const catchAll: {
  <E, E2, R2>(
    f: (e: E) => Route.Handler<E2, R2>
  ): <R>(self: HttpRouter<E, R>) => HttpRouter<E2, R | HttpRouter.ExcludeProvided<R2>>
  <E, R, E2, R2>(
    self: HttpRouter<E, R>,
    f: (e: E) => Route.Handler<E2, R2>
  ): HttpRouter<E2, R | HttpRouter.ExcludeProvided<R2>>
} = internal.catchAll

/**
 * @since 1.0.0
 * @category combinators
 */
export const catchAllCause: {
  <E, E2, R2>(
    f: (e: Cause.Cause<E>) => Route.Handler<E2, R2>
  ): <R>(self: HttpRouter<E, R>) => HttpRouter<E2, R | HttpRouter.ExcludeProvided<R2>>
  <E, R, E2, R2>(
    self: HttpRouter<E, R>,
    f: (e: Cause.Cause<E>) => Route.Handler<E2, R2>
  ): HttpRouter<E2, R | HttpRouter.ExcludeProvided<R2>>
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
    self: HttpRouter<E, R>
  ) => HttpRouter<E1 | Exclude<E, { _tag: K }>, R | HttpRouter.ExcludeProvided<R1>>
  <E, R, K extends E extends { _tag: string } ? E["_tag"] : never, E1, R1>(
    self: HttpRouter<E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Route.Handler<E1, R1>
  ): HttpRouter<E1 | Exclude<E, { _tag: K }>, R | HttpRouter.ExcludeProvided<R1>>
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
    self: HttpRouter<E, R>
  ) => HttpRouter<
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | R
    | HttpRouter.ExcludeProvided<
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
    self: HttpRouter<E, R>,
    cases: Cases
  ): HttpRouter<
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never
    }[keyof Cases],
    | R
    | HttpRouter.ExcludeProvided<
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
  ): <E, R>(self: HttpRouter<E, R>) => HttpRouter<E, Exclude<R, Context.Tag.Identifier<T>>>
  <E, R, T extends Context.Tag<any, any>>(
    self: HttpRouter<E, R>,
    tag: T,
    service: Context.Tag.Service<T>
  ): HttpRouter<E, Exclude<R, Context.Tag.Identifier<T>>>
} = internal.provideService

/**
 * @since 1.0.0
 * @category combinators
 */
export const provideServiceEffect: {
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    effect: Effect.Effect<Context.Tag.Service<T>, E1, R1>
  ): <E, R>(
    self: HttpRouter<E, R>
  ) => HttpRouter<
    E1 | E,
    | Exclude<R, Context.Tag.Identifier<T>>
    | Exclude<HttpRouter.ExcludeProvided<R1>, Context.Tag.Identifier<T>>
  >
  <E, R, T extends Context.Tag<any, any>, R1, E1>(
    self: HttpRouter<E, R>,
    tag: T,
    effect: Effect.Effect<Context.Tag.Service<T>, E1, R1>
  ): HttpRouter<
    E | E1,
    | Exclude<R, Context.Tag.Identifier<T>>
    | Exclude<HttpRouter.ExcludeProvided<R1>, Context.Tag.Identifier<T>>
  >
} = internal.provideServiceEffect

/**
 * @since 1.0.0
 * @category tags
 */
export const Tag: <const Name extends string>(
  id: Name
) => <Self, R = never, E = unknown>() => HttpRouter.TagClass<Self, Name, E, R | HttpRouter.DefaultServices> =
  internal.Tag

/**
 * @since 1.0.0
 * @category tags
 */
export class Default extends Tag("@effect/platform/HttpRouter/Default")<Default>() {}

/**
 * @since 1.0.0
 * @category utils
 */
export const toHttpApp: <E, R>(self: HttpRouter<E, R>) => Effect.Effect<App.Default<E | Error.RouteNotFound, R>> =
  internal.toHttpApp
