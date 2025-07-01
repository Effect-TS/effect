/**
 * @since 1.0.0
 */
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { compose, dual, identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Scope from "effect/Scope"
import * as Tracer from "effect/Tracer"
import * as FindMyWay from "find-my-way-ts"
import * as HttpApi from "./HttpApi.js"
import * as HttpApiBuilder from "./HttpApiBuilder.js"
import type * as HttpApiGroup from "./HttpApiGroup.js"
import type * as HttpMethod from "./HttpMethod.js"
import * as HttpMiddleware from "./HttpMiddleware.js"
import { RouteContext, RouteContextTypeId } from "./HttpRouter.js"
import * as HttpServer from "./HttpServer.js"
import * as HttpServerError from "./HttpServerError.js"
import * as OpenApi from "./OpenApi.js"

/**
 * @since 1.0.0
 * @category Re-exports
 */
export * as FindMyWay from "find-my-way-ts"

/**
 * @since 1.0.0
 * @category HttpRouter
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/HttpRouter/HttpRouter")

/**
 * @since 1.0.0
 * @category HttpRouter
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category HttpRouter
 */
export interface HttpRouter {
  readonly [TypeId]: TypeId

  readonly prefixed: (prefix: string) => HttpRouter

  readonly add: <E, R>(
    method: "*" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS",
    path: PathInput,
    handler:
      | Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
      | ((request: HttpServerRequest.HttpServerRequest) => Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>),
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ) => Effect.Effect<
    void,
    never,
    Type.From<"Requires", Exclude<R, Provided>> | Type.From<"Error", E>
  >

  readonly addAll: <const Routes extends ReadonlyArray<Route<any, any>>>(
    ...routes: Routes
  ) => Effect.Effect<
    void,
    never,
    | Type.From<"Requires", Exclude<Route.Context<Routes[number]>, Provided>>
    | Type.From<"Error", Route.Error<Routes[number]>>
  >

  readonly asHttpEffect: () => Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    unknown,
    HttpServerRequest.HttpServerRequest | Scope.Scope
  >
}

/**
 * @since 1.0.0
 * @category HttpRouter
 */
export const HttpRouter: Context.Tag<HttpRouter, HttpRouter> = Context.GenericTag<HttpRouter>(
  "@effect/platform/HttpLayerRouter"
)

/**
 * @since 1.0.0
 * @category HttpRouter
 */
export const make = (options?: Partial<FindMyWay.RouterConfig>) => {
  const router = FindMyWay.make<Route<any, never>>(options)

  const addAll = <const Routes extends ReadonlyArray<Route<any, any>>>(
    ...routes: Routes
  ): Effect.Effect<
    void,
    never,
    | Type.From<"Requires", Exclude<Route.Context<Routes[number]>, Provided>>
    | Type.From<"Error", Route.Error<Routes[number]>>
  > =>
    Effect.contextWith((context: Context.Context<never>) => {
      const middleware = getMiddleware(context)
      const applyMiddleware = (effect: Effect.Effect<HttpServerResponse.HttpServerResponse>) => {
        for (let i = middleware.length - 1; i >= 0; i--) {
          effect = middleware[i](effect)
        }
        return effect
      }
      for (let i = 0; i < routes.length; i++) {
        const route = middleware.length === 0 ? routes[i] : makeRoute({
          ...routes[i],
          handler: applyMiddleware(routes[i].handler as Effect.Effect<HttpServerResponse.HttpServerResponse>)
        })
        router.on(route.method, route.path, route as any)
      }
    })

  return HttpRouter.of({
    [TypeId]: TypeId,
    prefixed(this: HttpRouter, prefix: string) {
      return HttpRouter.of({
        [TypeId]: TypeId,
        asHttpEffect: this.asHttpEffect,
        prefixed: (newPrefix: string) => this.prefixed(prefixPath(prefix, newPrefix)),
        addAll: (...routes) => this.addAll(...routes.map(prefixRoute(prefix))) as any,
        add: (method, path, handler, options) =>
          this.add(method, prefixPath(prefix, path) as PathInput, handler, options)
      })
    },
    addAll,
    add: (method, path, handler, options) =>
      addAll(makeRoute({
        ...options,
        method,
        path,
        handler: Effect.isEffect(handler) ? handler : Effect.flatMap(HttpServerRequest.HttpServerRequest, handler)
      })),
    asHttpEffect() {
      return Effect.withFiberRuntime((fiber) => {
        const contextMap = new Map(fiber.currentContext.unsafeMap)
        const request = contextMap.get(HttpServerRequest.HttpServerRequest.key) as HttpServerRequest.HttpServerRequest
        let result = router.find(request.method, request.url)
        if (result === undefined && request.method === "HEAD") {
          result = router.find("GET", request.url)
        }
        if (result === undefined) {
          return Effect.fail(new HttpServerError.RouteNotFound({ request }))
        }
        const route = result.handler
        if (route.prefix._tag === "Some") {
          contextMap.set(HttpServerRequest.HttpServerRequest.key, sliceRequestUrl(request, route.prefix.value))
        }
        contextMap.set(HttpServerRequest.ParsedSearchParams.key, result.searchParams)
        contextMap.set(RouteContext.key, {
          [RouteContextTypeId]: RouteContextTypeId,
          route,
          params: result.params
        })

        const span = contextMap.get(Tracer.ParentSpan.key) as Tracer.Span | undefined
        if (span && span._tag === "Span") {
          span.attribute("http.route", route.path)
        }
        return Effect.locally(
          (route.uninterruptible ?
            route.handler :
            Effect.interruptible(route.handler)) as Effect.Effect<
              HttpServerResponse.HttpServerResponse,
              unknown
            >,
          FiberRef.currentContext,
          Context.unsafeMake(contextMap)
        )
      })
    }
  })
}

function sliceRequestUrl(request: HttpServerRequest.HttpServerRequest, prefix: string) {
  const prefexLen = prefix.length
  return request.modify({ url: request.url.length <= prefexLen ? "/" : request.url.slice(prefexLen) })
}

/**
 * @since 1.0.0
 * @category HttpRouter
 */
export const layer: Layer.Layer<HttpRouter> = Layer.sync(HttpRouter, () => make())

/**
 * @since 1.0.0
 * @category HttpRouter
 */
export const layerOptions = (options?: Partial<FindMyWay.RouterConfig>): Layer.Layer<HttpRouter> =>
  Layer.sync(HttpRouter, () => make(options))

/**
 * @since 1.0.0
 * @category HttpRouter
 */
export const toHttpEffect = <A, E, R>(
  appLayer: Layer.Layer<A, E, R>,
  options?: Partial<FindMyWay.RouterConfig>
): Effect.Effect<
  Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    Type.Only<"Error", R> | HttpServerError.RouteNotFound,
    Scope.Scope | HttpServerRequest.HttpServerRequest | Type.Only<"Requires", R>
  >,
  E,
  Exclude<Type.Without<R>, HttpRouter> | Scope.Scope
> =>
  Effect.gen(function*() {
    const routerLayer = options ? layerOptions(options) : layer
    const scope = yield* Effect.scope
    const memoMap = yield* Layer.CurrentMemoMap
    const context = yield* Layer.buildWithMemoMap(
      Layer.provideMerge(appLayer, routerLayer),
      memoMap,
      scope
    )
    const router = Context.get(context, HttpRouter)
    return router.asHttpEffect()
  }) as any

/**
 * @since 1.0.0
 * @category Route
 */
export const RouteTypeId: unique symbol = Symbol.for("@effect/platform/HttpLayerRouter/Route")

/**
 * @since 1.0.0
 * @category Route
 */
export type RouteTypeId = typeof RouteTypeId

/**
 * @since 1.0.0
 * @category Route
 */
export interface Route<E = never, R = never> {
  readonly [RouteTypeId]: RouteTypeId
  readonly method: HttpMethod.HttpMethod | "*"
  readonly path: PathInput
  readonly handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
  readonly uninterruptible: boolean
  readonly prefix: Option.Option<string>
}

/**
 * @since 1.0.0
 * @category Route
 */
export declare namespace Route {
  /**
   * @since 1.0.0
   * @category Route
   */
  export type Error<R extends Route<any, any>> = R extends Route<infer E, infer _R> ? E : never

  /**
   * @since 1.0.0
   * @category Route
   */
  export type Context<T extends Route<any, any>> = T extends Route<infer _E, infer R> ? R : never
}

/**
 * @since 1.0.0
 * @category Route
 */
export const makeRoute = <E, R>(options: {
  readonly method: HttpMethod.HttpMethod | "*"
  readonly path: PathInput
  readonly handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
  readonly uninterruptible?: boolean | undefined
  readonly prefix?: Option.Option<string> | undefined
}): Route<E, R> => ({
  ...options,
  uninterruptible: options.uninterruptible ?? false,
  prefix: options.prefix ?? Option.none(),
  [RouteTypeId]: RouteTypeId
})

/**
 * @since 1.0.0
 * @category PathInput
 */
export type PathInput = `/${string}` | "*"

const removeTrailingSlash = (
  path: PathInput
): PathInput => (path.endsWith("/") ? path.slice(0, -1) : path) as any

/**
 * @since 1.0.0
 * @category PathInput
 */
export const prefixPath: {
  (prefix: string): (self: string) => string
  (self: string, prefix: string): string
} = dual(2, (self: string, prefix: string) => {
  prefix = removeTrailingSlash(prefix as PathInput)
  return self === "/" ? prefix : prefix + self
})

/**
 * @since 1.0.0
 * @category Route
 */
export const prefixRoute: {
  (prefix: string): <E, R>(self: Route<E, R>) => Route<E, R>
  <E, R>(self: Route<E, R>, prefix: string): Route<E, R>
} = dual(2, <E, R>(self: Route<E, R>, prefix: string): Route<E, R> =>
  makeRoute({
    ...self,
    path: prefixPath(self.path, prefix) as PathInput,
    prefix: Option.match(self.prefix, {
      onNone: () => Option.some(prefix as string),
      onSome: (existingPrefix) => Option.some(prefixPath(existingPrefix, prefix) as string)
    })
  }))

/**
 * Represents a request-level dependency, that needs to be provided by
 * middleware.
 *
 * @since 1.0.0
 * @category Request types
 */
export interface Type<Kind extends string, T> {
  readonly _: unique symbol
  readonly kind: Kind
  readonly type: T
}

/**
 * @since 1.0.0
 * @category Request types
 */
export declare namespace Type {
  /**
   * @since 1.0.0
   * @category Request types
   */
  export type From<Kind extends string, R> = R extends infer T ? Type<Kind, T> : never

  /**
   * @since 1.0.0
   * @category Request types
   */
  export type Only<Kind extends string, A> = A extends Type<Kind, infer T> ? T : never

  /**
   * @since 1.0.0
   * @category Request types
   */
  export type Without<A> = A extends Type<infer _Kind, infer _> ? never : A
}

/**
 * Services provided by the HTTP router, which are available in the
 * request context.
 *
 * @since 1.0.0
 * @category Request types
 */
export type Provided =
  | HttpServerRequest.HttpServerRequest
  | Scope.Scope
  | HttpServerRequest.ParsedSearchParams
  | RouteContext

/**
 * @since 1.0.0
 * @category Middleware
 */
export const MiddlewareTypeId: unique symbol = Symbol.for("@effect/platform/HttpLayerRouter/Middleware")

/**
 * @since 1.0.0
 * @category Middleware
 */
export type MiddlewareTypeId = typeof MiddlewareTypeId

/**
 * @since 1.0.0
 * @category Middleware
 */
export interface Middleware<
  Config extends {
    provides: any
    handles: any
    error: any
    requires: any
    layerError: any
    layerRequires: any
  }
> {
  readonly [MiddlewareTypeId]: Config

  readonly layer: [Config["requires"]] extends [never] ? Layer.Layer<
      Type.From<"Requires", Config["provides"]>,
      Config["layerError"],
      Config["layerRequires"] | Type.From<"Requires", Config["requires"]>
    >
    : "Need to .provide(middleware) that satisfy the missing request dependencies"

  readonly provide: <
    Config2 extends {
      provides: any
      handles: any
      error: any
      requires: any
      layerError: any
      layerRequires: any
    }
  >(other: Middleware<Config2>) => Middleware<{
    provides: Config2["provides"] | Config["provides"]
    handles: Config2["handles"] | Config["handles"]
    error: Config2["error"] | Exclude<Config["error"], Config2["handles"]>
    requires: Exclude<Config["requires"], Config2["provides"]> | Config2["requires"]
    layerError: Config["layerError"] | Config2["layerError"]
    layerRequires: Config["layerRequires"] | Config2["layerRequires"]
  }>
}

/**
 * Create a middleware layer that can be used to modify requests and responses.
 *
 * @since 1.0.0
 * @category Middleware
 */
export const middleware:
  & middleware.Make<never, never>
  & (<
    Config extends {
      provides?: any
      handles?: any
    } = {}
  >() => middleware.Make<
    Config extends { provides: infer R } ? R : never,
    Config extends { handles: infer E } ? E : never
  >) = function() {
    const make = (middleware: any) =>
      new MiddlewareImpl(
        Effect.isEffect(middleware) ?
          Layer.scopedContext(Effect.map(middleware, (fn) => Context.unsafeMake(new Map([[fnContextKey, fn]])))) :
          Layer.succeedContext(Context.unsafeMake(new Map([[fnContextKey, middleware]]))) as any,
        Layer.empty as any
      )
    if (arguments.length === 0) {
      return make as any
    }
    return make(arguments[0])
  }

let middlewareId = 0
const fnContextKey = "@effect/platform/HttpLayerRouter/MiddlewareFn"

class MiddlewareImpl<
  Config extends {
    provides: any
    handles: any
    error: any
    requires: any
    layerError: any
    layerRequires: any
  }
> implements Middleware<Config> {
  readonly [MiddlewareTypeId]: Config = {} as any

  constructor(
    readonly layerFn: Layer.Layer<never>,
    readonly dependencies: Layer.Layer<any, any, any>
  ) {
    const contextKey = `@effect/platform/HttpLayerRouter/Middleware-${++middlewareId}` as const
    this.layer = Layer.scopedContext(Effect.gen(this, function*() {
      const context = yield* Effect.context<Scope.Scope>()
      const memoMap = yield* Layer.CurrentMemoMap
      const scope = Context.get(context, Scope.Scope)
      const depsContext = yield* Layer.buildWithMemoMap(this.dependencies, memoMap, scope)
      const deps = getMiddleware(depsContext)
      let fn = context.unsafeMap.get(fnContextKey)
      if (deps.length > 0) {
        const prevFn = fn
        fn = (effect: Effect.Effect<HttpServerResponse.HttpServerResponse>) => {
          effect = prevFn(effect)
          for (let i = deps.length - 1; i >= 0; i--) {
            effect = deps[i](effect)
          }
          return effect
        }
      }
      return Context.unsafeMake<never>(new Map([[contextKey, fn]]))
    })).pipe(Layer.provide(this.layerFn))
  }

  layer: any

  provide<
    Config2 extends {
      provides: any
      handles: any
      error: any
      requires: any
      layerError: any
      layerRequires: any
    }
  >(other: Middleware<Config2>): Middleware<any> {
    return new MiddlewareImpl(
      this.layerFn,
      Layer.provideMerge(this.dependencies, other.layer as any)
    ) as any
  }
}

const middlewareCache = new WeakMap<Context.Context<never>, any>()
const getMiddleware = (context: Context.Context<never>): Array<
  (
    effect: Effect.Effect<HttpServerResponse.HttpServerResponse>
  ) => Effect.Effect<HttpServerResponse.HttpServerResponse>
> => {
  const arr = middlewareCache.get(context)
  if (arr) return arr
  const middleware = Arr.empty<
    (
      effect: Effect.Effect<HttpServerResponse.HttpServerResponse>
    ) => Effect.Effect<HttpServerResponse.HttpServerResponse>
  >()
  for (const key of context.unsafeMap.keys()) {
    if (key.startsWith("@effect/platform/HttpLayerRouter/Middleware-")) {
      middleware.push(context.unsafeMap.get(key))
    }
  }
  middlewareCache.set(context, middleware)
  return middleware
}

/**
 * @since 1.0.0
 * @category Middleware
 */
export declare namespace middleware {
  /**
   * @since 1.0.0
   * @category Middleware
   */
  export type Make<Provides, Handles> = {
    <E, R, EX, RX>(
      middleware: Effect.Effect<
        (
          effect: Effect.Effect<
            HttpServerResponse.HttpServerResponse,
            Handles,
            Provides
          >
        ) => Effect.Effect<
          HttpServerResponse.HttpServerResponse,
          E,
          R
        >,
        EX,
        RX
      >
    ): Middleware<{
      provides: Provides
      handles: Handles
      error: E
      requires: Exclude<R, Provided>
      layerError: EX
      layerRequires: Exclude<RX, Scope.Scope>
    }>
    <E, R>(
      middleware: (
        effect: Effect.Effect<
          HttpServerResponse.HttpServerResponse,
          Handles,
          Provides
        >
      ) => Effect.Effect<
        HttpServerResponse.HttpServerResponse,
        E,
        R
      >
    ): Middleware<{
      provides: Provides
      handles: Handles
      error: E
      requires: Exclude<R, Provided>
      layerError: never
      layerRequires: never
    }>
  }

  /**
   * @since 1.0.0
   * @category Middleware
   */
  export type Fn = (
    effect: Effect.Effect<HttpServerResponse.HttpServerResponse>
  ) => Effect.Effect<HttpServerResponse.HttpServerResponse>
}

/**
 * @since 1.0.0
 * @category HttpApi
 */
export const addHttpApi = <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, E, R>(
  api: HttpApi.HttpApi<Id, Groups, E, R>,
  options?: {
    readonly openapiPath?: `/${string}` | undefined
  }
): Layer.Layer<
  HttpApi.Api,
  never,
  HttpRouter | HttpApiGroup.HttpApiGroup.ToService<Id, Groups> | R | HttpApiGroup.HttpApiGroup.ErrorContext<Groups>
> => {
  const ApiMiddleware = middleware(HttpApiBuilder.buildMiddleware(api)).layer

  return HttpApiBuilder.Router.unwrap(Effect.fnUntraced(function*(router_) {
    const contextMap = new Map<string, unknown>()
    const router = yield* HttpRouter
    const routes = Arr.empty<Route<any, any>>()
    const context = yield* Effect.context<never>()

    contextMap.set(HttpApi.Api.key, { api, context })

    for (const route of router_.routes) {
      routes.push(makeRoute(route as any))
    }

    yield* (router.addAll(...routes) as Effect.Effect<void>)

    if (options?.openapiPath) {
      const spec = OpenApi.fromApi(api)
      yield* router.add("GET", options.openapiPath, Effect.succeed(HttpServerResponse.unsafeJson(spec)))
    }

    return Context.unsafeMake<any>(contextMap)
  }, Layer.effectContext)).pipe(
    Layer.provide(ApiMiddleware)
  )
}

/**
 * @since 1.0.0
 * @category Server
 */
export const serve = <A, E, R, HE, HR = Type.Only<"Requires", R>>(
  appLayer: Layer.Layer<A, E, R>,
  options?: {
    readonly routerConfig?: Partial<FindMyWay.RouterConfig> | undefined
    readonly disableLogger?: boolean | undefined
    readonly disableListenLog?: boolean
    readonly middleware?: (
      effect: Effect.Effect<
        HttpServerResponse.HttpServerResponse,
        Type.Only<"Error", R> | HttpServerError.RouteNotFound,
        Scope.Scope | HttpServerRequest.HttpServerRequest | Type.Only<"Requires", R>
      >
    ) => Effect.Effect<HttpServerResponse.HttpServerResponse, HE, HR>
  }
): Layer.Layer<never, E, HttpServer.HttpServer | Exclude<Type.Without<R> | Exclude<HR, Provided>, HttpRouter>> => {
  let middleware: any = options?.middleware
  if (options?.disableLogger !== true) {
    middleware = middleware ? compose(HttpMiddleware.logger, middleware) : HttpMiddleware.logger
  }
  const RouterLayer = options?.routerConfig ? layerOptions(options.routerConfig) : layer
  return Effect.gen(function*() {
    const router = yield* HttpRouter
    const handler = router.asHttpEffect()
    return middleware ? HttpServer.serve(handler, middleware) : HttpServer.serve(handler)
  }).pipe(
    Layer.unwrapScoped,
    options?.disableListenLog ? identity : HttpServer.withLogAddress,
    Layer.provide(appLayer),
    Layer.provide(RouterLayer)
  ) as any
}
