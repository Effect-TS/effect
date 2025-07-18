import type * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import * as FiberRef from "effect/FiberRef"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Inspectable from "effect/Inspectable"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import * as Tracer from "effect/Tracer"
import type { Mutable } from "effect/Types"
import * as FindMyWay from "find-my-way-ts"
import type * as App from "../HttpApp.js"
import type * as Method from "../HttpMethod.js"
import type * as Router from "../HttpRouter.js"
import * as HttpServer from "../HttpServer.js"
import * as Error from "../HttpServerError.js"
import * as ServerRequest from "../HttpServerRequest.js"
import * as Respondable from "../HttpServerRespondable.js"
import type * as ServerResponse from "../HttpServerResponse.js"

/** @internal */
export const TypeId: Router.TypeId = Symbol.for("@effect/platform/HttpRouter") as Router.TypeId

/** @internal */
export const RouteTypeId: Router.RouteTypeId = Symbol.for("@effect/platform/HttpRouter/Route") as Router.RouteTypeId

/** @internal */
export const RouteContextTypeId: Router.RouteContextTypeId = Symbol.for(
  "@effect/platform/HttpRouter/RouteContext"
) as Router.RouteContextTypeId

/** @internal */
export const RouteContext = Context.GenericTag<Router.RouteContext>("@effect/platform/HttpRouter/RouteContext")

const isRouter = (u: unknown): u is Router.HttpRouter<unknown, unknown> => Predicate.hasProperty(u, TypeId)

/** @internal */
export const params = Effect.map(RouteContext, (_) => _.params)

/** @internal */
export const schemaJson = <
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
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(
    Effect.context<ServerRequest.HttpServerRequest | ServerRequest.ParsedSearchParams | Router.RouteContext>(),
    (context) => {
      const request = Context.get(context, ServerRequest.HttpServerRequest)
      const searchParams = Context.get(context, ServerRequest.ParsedSearchParams)
      const routeContext = Context.get(context, RouteContext)
      return Effect.flatMap(request.json, (body) =>
        parse({
          method: request.method,
          url: request.url,
          headers: request.headers,
          cookies: request.cookies,
          pathParams: routeContext.params,
          searchParams,
          body
        }))
    }
  )
}

/** @internal */
export const schemaNoBody = <
  R,
  I extends Partial<{
    readonly method: Method.HttpMethod
    readonly url: string
    readonly cookies: Readonly<Record<string, string | undefined>>
    readonly headers: Readonly<Record<string, string | undefined>>
    readonly pathParams: Readonly<Record<string, string | undefined>>
    readonly searchParams: Readonly<Record<string, string | ReadonlyArray<string> | undefined>>
  }>,
  A
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(
    Effect.context<ServerRequest.HttpServerRequest | ServerRequest.ParsedSearchParams | Router.RouteContext>(),
    (context) => {
      const request = Context.get(context, ServerRequest.HttpServerRequest)
      const searchParams = Context.get(context, ServerRequest.ParsedSearchParams)
      const routeContext = Context.get(context, RouteContext)
      return parse({
        method: request.method,
        url: request.url,
        headers: request.headers,
        cookies: request.cookies,
        pathParams: routeContext.params,
        searchParams
      })
    }
  )
}

/** @internal */
export const schemaParams = <A, I extends Readonly<Record<string, string | ReadonlyArray<string> | undefined>>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(
    Effect.context<ServerRequest.ParsedSearchParams | Router.RouteContext>(),
    (context) => {
      const searchParams = Context.get(context, ServerRequest.ParsedSearchParams)
      const routeContext = Context.get(context, RouteContext)
      return parse({ ...searchParams, ...routeContext.params })
    }
  )
}

/** @internal */
export const schemaPathParams = <A, I extends Readonly<Record<string, string | undefined>>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(RouteContext, (_) => parse(_.params))
}

/** @internal */
export const currentRouterConfig = globalValue(
  "@effect/platform/HttpRouter/currentRouterConfig",
  () => FiberRef.unsafeMake<Partial<FindMyWay.RouterConfig>>({})
)

/** @internal */
export const withRouterConfig: {
  (config: Partial<FindMyWay.RouterConfig>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(effect: Effect.Effect<A, E, R>, config: Partial<FindMyWay.RouterConfig>): Effect.Effect<A, E, R>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, config: Partial<FindMyWay.RouterConfig>): Effect.Effect<A, E, R> =>
    Effect.locally(effect, currentRouterConfig, config)
)

/** @internal */
export const setRouterConfig = (config: Partial<FindMyWay.RouterConfig>) =>
  Layer.locallyScoped(currentRouterConfig, config)

class RouterImpl<E = never, R = never> extends Effectable.StructuralClass<
  ServerResponse.HttpServerResponse,
  E | Error.RouteNotFound,
  Exclude<R, Router.RouteContext>
> implements Router.HttpRouter<E, R> {
  readonly [TypeId]: Router.TypeId
  constructor(
    readonly routes: Chunk.Chunk<Router.Route<E, R>>,
    readonly mounts: Chunk.Chunk<
      readonly [
        prefix: string,
        httpApp: App.Default<E, R>,
        options?: { readonly includePrefix?: boolean | undefined } | undefined
      ]
    >
  ) {
    super()
    this[TypeId] = TypeId
    this.httpApp = toHttpApp(this).pipe(
      Effect.flatMap((app) => this.httpApp = app as any)
    ) as any
  }
  private httpApp: Effect.Effect<
    ServerResponse.HttpServerResponse,
    E | Error.RouteNotFound,
    Exclude<R, Router.RouteContext>
  >
  commit() {
    return this.httpApp
  }
  toJSON() {
    return {
      _id: "Router",
      routes: this.routes.toJSON(),
      mounts: this.mounts.toJSON()
    }
  }
  toString() {
    return Inspectable.format(this)
  }
  [Inspectable.NodeInspectSymbol]() {
    return this.toJSON()
  }
}

/** @internal */
export const toHttpApp = <E, R>(
  self: Router.HttpRouter<E, R>
): Effect.Effect<App.Default<E | Error.RouteNotFound, R>> =>
  Effect.map(FiberRef.get(currentRouterConfig), (config) => {
    const router = FindMyWay.make<Router.Route<E, R>>(config)
    const mounts = Chunk.toReadonlyArray(self.mounts).map(([path, app, options]) =>
      [
        path,
        new RouteContextImpl(
          new RouteImpl(
            "*",
            options?.includePrefix ? `${path}/*` as Router.PathInput : "/*",
            app,
            options?.includePrefix ? Option.none() : Option.some(path),
            false
          ),
          {}
        ),
        options
      ] as const
    )
    const mountsLen = mounts.length
    Chunk.forEach(self.routes, (route) => {
      if (route.method === "*") {
        router.all(route.path, route)
      } else {
        router.on(route.method, route.path, route)
      }
    })
    return Effect.withFiberRuntime<
      ServerResponse.HttpServerResponse,
      E | Error.RouteNotFound,
      R | ServerRequest.HttpServerRequest
    >((fiber) => {
      const context = Context.unsafeMake(new Map(fiber.getFiberRef(FiberRef.currentContext).unsafeMap))
      const request = Context.unsafeGet(context, ServerRequest.HttpServerRequest)
      if (mountsLen > 0) {
        const searchIndex = request.url.indexOf("?")
        const pathname = searchIndex === -1 ? request.url : request.url.slice(0, searchIndex)

        for (let i = 0; i < mountsLen; i++) {
          const [path, routeContext, options] = mounts[i]
          if (pathname === path || pathname.startsWith(path + "/")) {
            context.unsafeMap.set(RouteContext.key, routeContext)
            if (options?.includePrefix !== true) {
              context.unsafeMap.set(ServerRequest.HttpServerRequest.key, sliceRequestUrl(request, path))
            }
            return Effect.locally(
              Effect.flatMap(routeContext.route.handler, Respondable.toResponse) as App.Default<E, R>,
              FiberRef.currentContext,
              context
            )
          }
        }
      }

      let result = router.find(request.method, request.url)
      if (result === undefined && request.method === "HEAD") {
        result = router.find("GET", request.url)
      }
      if (result === undefined) {
        return Effect.fail(new Error.RouteNotFound({ request }))
      }
      const route = result.handler
      if (route.prefix._tag === "Some") {
        context.unsafeMap.set(ServerRequest.HttpServerRequest.key, sliceRequestUrl(request, route.prefix.value))
      }
      context.unsafeMap.set(ServerRequest.ParsedSearchParams.key, result.searchParams)
      context.unsafeMap.set(RouteContext.key, new RouteContextImpl(route, result.params))

      const span = Context.getOption(context, Tracer.ParentSpan)
      if (span._tag === "Some" && span.value._tag === "Span") {
        span.value.attribute("http.route", route.path)
      }

      const handlerResponse = Effect.flatMap(route.handler, Respondable.toResponse)
      return Effect.locally(
        (route.uninterruptible ?
          handlerResponse :
          Effect.interruptible(handlerResponse)) as Effect.Effect<
            ServerResponse.HttpServerResponse,
            E,
            Router.HttpRouter.ExcludeProvided<R>
          >,
        FiberRef.currentContext,
        context
      )
    })
  })

function sliceRequestUrl(request: ServerRequest.HttpServerRequest, prefix: string) {
  const prefexLen = prefix.length
  return request.modify({ url: request.url.length <= prefexLen ? "/" : request.url.slice(prefexLen) })
}

class RouteImpl<E = never, R = never> extends Inspectable.Class implements Router.Route<E, R> {
  readonly [RouteTypeId]: Router.RouteTypeId
  constructor(
    readonly method: Method.HttpMethod | "*",
    readonly path: Router.PathInput,
    readonly handler: Router.Route.Handler<E, R>,
    readonly prefix = Option.none<string>(),
    readonly uninterruptible = false
  ) {
    super()
    this[RouteTypeId] = RouteTypeId
  }
  toJSON(): unknown {
    return {
      _id: "@effect/platform/HttpRouter/Route",
      method: this.method,
      path: this.path,
      prefix: this.prefix.toJSON()
    }
  }
}

class RouteContextImpl implements Router.RouteContext {
  readonly [RouteContextTypeId]: Router.RouteContextTypeId
  constructor(
    readonly route: Router.Route<unknown, unknown>,
    readonly params: Readonly<Record<string, string | undefined>>
  ) {
    this[RouteContextTypeId] = RouteContextTypeId
  }
}

/** @internal */
export const empty: Router.HttpRouter<never> = new RouterImpl(Chunk.empty(), Chunk.empty())

/** @internal */
export const fromIterable = <R extends Router.Route<any, any>>(
  routes: Iterable<R>
): Router.HttpRouter<
  R extends Router.Route<infer E, infer _> ? E : never,
  R extends Router.Route<infer _, infer Env> ? Env : never
> => new RouterImpl(Chunk.fromIterable(routes), Chunk.empty()) as any

/** @internal */
export const makeRoute = <E, R>(
  method: Method.HttpMethod | "*",
  path: Router.PathInput,
  handler: Router.Route.Handler<E, R>,
  options?: {
    readonly prefix?: string | undefined
    readonly uninterruptible?: boolean | undefined
  } | undefined
): Router.Route<E, Router.HttpRouter.ExcludeProvided<R>> =>
  new RouteImpl(
    method,
    path,
    handler,
    options?.prefix ? Option.some(options.prefix) : Option.none(),
    options?.uninterruptible ?? false
  ) as any

/** @internal */
export const append = dual<
  <R1, E1>(
    route: Router.Route<E1, R1>
  ) => <E, R>(self: Router.HttpRouter<E, R>) => Router.HttpRouter<E | E1, R | Router.HttpRouter.ExcludeProvided<R1>>,
  <E, R, E1, R1>(
    self: Router.HttpRouter<E, R>,
    route: Router.Route<E1, R1>
  ) => Router.HttpRouter<E | E1, R | Router.HttpRouter.ExcludeProvided<R1>>
>(2, (self, route) => new RouterImpl(Chunk.append(self.routes, route) as any, self.mounts))

/** @internal */
export const concat = dual<
  <R1, E1>(
    that: Router.HttpRouter<E1, R1>
  ) => <E, R>(self: Router.HttpRouter<E, R>) => Router.HttpRouter<E | E1, R | R1>,
  <E, R, E1, R1>(self: Router.HttpRouter<E, R>, that: Router.HttpRouter<E1, R1>) => Router.HttpRouter<E | E1, R | R1>
>(2, (self, that) => concatAll(self, that))

/** @internal */
export const concatAll = <Routers extends ReadonlyArray<Router.HttpRouter<E, R>>, E, R>(
  ...routers: Routers
) =>
  new RouterImpl(
    routers.reduce((cur, acc) => Chunk.appendAll(cur, acc.routes), Chunk.empty<Router.Route<E, R>>()),
    routers.reduce(
      (cur, acc) => Chunk.appendAll(cur, acc.mounts),
      Chunk.empty<
        readonly [
          prefix: string,
          httpApp: App.Default<E, R>,
          options?: { readonly includePrefix?: boolean | undefined } | undefined
        ]
      >()
    )
  ) as any

const removeTrailingSlash = (
  path: Router.PathInput
): Router.PathInput => (path.endsWith("/") ? path.slice(0, -1) : path) as any

/** @internal */
export const prefixPath: {
  (prefix: string): (self: string) => string
  (self: string, prefix: string): string
} = dual(2, (self, prefix) => {
  prefix = removeTrailingSlash(prefix)
  return self === "/" ? prefix : prefix + self
})

/** @internal */
export const prefixAll = dual<
  (prefix: Router.PathInput) => <E, R>(self: Router.HttpRouter<E, R>) => Router.HttpRouter<E, R>,
  <E, R>(self: Router.HttpRouter<E, R>, prefix: Router.PathInput) => Router.HttpRouter<E, R>
>(
  2,
  (self, prefix) => {
    prefix = removeTrailingSlash(prefix)
    return new RouterImpl(
      Chunk.map(self.routes, (route) =>
        new RouteImpl(
          route.method,
          route.path === "/" ? prefix : prefix + route.path as Router.PathInput,
          route.handler,
          Option.orElse(
            Option.map(route.prefix, (_) => prefix + _),
            () => Option.some(prefix)
          ),
          route.uninterruptible
        )),
      Chunk.map(self.mounts, ([path, app]) => [path === "/" ? prefix : prefix + path, app])
    )
  }
)

/** @internal */
export const mount = dual<
  <R1, E1>(
    path: `/${string}`,
    that: Router.HttpRouter<E1, R1>
  ) => <E, R>(self: Router.HttpRouter<E, R>) => Router.HttpRouter<E | E1, R | R1>,
  <E, R, E1, R1>(
    self: Router.HttpRouter<E, R>,
    path: `/${string}`,
    that: Router.HttpRouter<E1, R1>
  ) => Router.HttpRouter<E | E1, R | R1>
>(
  3,
  (self, path, that) => concat(self, prefixAll(that, path))
)

/** @internal */
export const mountApp = dual<
  <R1, E1>(
    path: `/${string}`,
    that: App.Default<E1, R1>,
    options?: {
      readonly includePrefix?: boolean | undefined
    } | undefined
  ) => <E, R>(
    self: Router.HttpRouter<E, R>
  ) => Router.HttpRouter<E | E1, R | Router.HttpRouter.ExcludeProvided<R1>>,
  <E, R, E1, R1>(
    self: Router.HttpRouter<E, R>,
    path: `/${string}`,
    that: App.Default<E1, R1>,
    options?: {
      readonly includePrefix?: boolean | undefined
    } | undefined
  ) => Router.HttpRouter<E | E1, R | Router.HttpRouter.ExcludeProvided<R1>>
>(
  (args) => Predicate.hasProperty(args[0], TypeId),
  <E, R, E1, R1>(
    self: Router.HttpRouter<E, R>,
    path: `/${string}`,
    that: App.Default<E1, R1>,
    options?: {
      readonly includePrefix?: boolean | undefined
    } | undefined
  ): Router.HttpRouter<E | E1, R | Router.HttpRouter.ExcludeProvided<R1>> =>
    new RouterImpl<any, any>(self.routes, Chunk.append(self.mounts, [removeTrailingSlash(path), that, options])) as any
)

/** @internal */
export const route = (method: Method.HttpMethod | "*"): {
  <R1, E1>(
    path: Router.PathInput,
    handler: Router.Route.Handler<E1, R1>,
    options?: {
      readonly uninterruptible?: boolean | undefined
    } | undefined
  ): <E, R>(
    self: Router.HttpRouter<E, R>
  ) => Router.HttpRouter<E1 | E, R | Router.HttpRouter.ExcludeProvided<R1>>
  <E, R, E1, R1>(
    self: Router.HttpRouter<E, R>,
    path: Router.PathInput,
    handler: Router.Route.Handler<E1, R1>,
    options?: {
      readonly uninterruptible?: boolean | undefined
    } | undefined
  ): Router.HttpRouter<E1 | E, R | Router.HttpRouter.ExcludeProvided<R1>>
} =>
  dual<
    <R1, E1>(
      path: Router.PathInput,
      handler: Router.Route.Handler<R1, E1>
    ) => <E, R>(
      self: Router.HttpRouter<E, R>
    ) => Router.HttpRouter<E | E1, R | Router.HttpRouter.ExcludeProvided<R1>>,
    <E, R, E1, R1>(
      self: Router.HttpRouter<E, R>,
      path: Router.PathInput,
      handler: Router.Route.Handler<E1, R1>,
      options?: {
        readonly uninterruptible?: boolean | undefined
      } | undefined
    ) => Router.HttpRouter<E | E1, R | Router.HttpRouter.ExcludeProvided<R1>>
  >((args) => isRouter(args[0]), (self, path, handler, options) =>
    new RouterImpl<any, any>(
      Chunk.append(
        self.routes,
        new RouteImpl(
          method,
          path,
          handler,
          Option.none(),
          options?.uninterruptible ?? false
        )
      ),
      self.mounts
    ))

/** @internal */
export const all = route("*")

/** @internal */
export const get = route("GET")

/** @internal */
export const post = route("POST")

/** @internal */
export const put = route("PUT")

/** @internal */
export const patch = route("PATCH")

/** @internal */
export const del = route("DELETE")

/** @internal */
export const head = route("HEAD")

/** @internal */
export const options = route("OPTIONS")

/** @internal */
export const use = dual<
  <E, R, R1, E1>(
    f: (self: Router.Route.Middleware<E, R>) => App.Default<E1, R1>
  ) => (self: Router.HttpRouter<E, R>) => Router.HttpRouter<E1, Router.HttpRouter.ExcludeProvided<R1>>,
  <E, R, R1, E1>(
    self: Router.HttpRouter<E, R>,
    f: (self: Router.Route.Middleware<E, R>) => App.Default<E1, R1>
  ) => Router.HttpRouter<E1, Router.HttpRouter.ExcludeProvided<R1>>
>(2, (self, f) =>
  new RouterImpl<any, any>(
    Chunk.map(
      self.routes,
      (route) =>
        new RouteImpl(
          route.method,
          route.path,
          f(Effect.flatMap(route.handler, Respondable.toResponse)) as any,
          route.prefix,
          route.uninterruptible
        )
    ),
    Chunk.map(
      self.mounts,
      ([path, app]) => [path, f(app as any)]
    )
  ))

/** @internal */
export const transform = dual<
  <E, R, R1, E1>(
    f: (self: Router.Route.Handler<E, R>) => App.HttpApp<Respondable.Respondable, E1, R1>
  ) => (self: Router.HttpRouter<E, R>) => Router.HttpRouter<E1, Router.HttpRouter.ExcludeProvided<R1>>,
  <E, R, R1, E1>(
    self: Router.HttpRouter<E, R>,
    f: (self: Router.Route.Handler<E, R>) => App.HttpApp<Respondable.Respondable, E1, R1>
  ) => Router.HttpRouter<E1, Router.HttpRouter.ExcludeProvided<R1>>
>(2, (self, f) =>
  new RouterImpl<any, any>(
    Chunk.map(
      self.routes,
      (route) =>
        new RouteImpl(
          route.method,
          route.path,
          f(route.handler) as any,
          route.prefix,
          route.uninterruptible
        )
    ),
    Chunk.map(
      self.mounts,
      ([path, app]) => [path, Effect.flatMap(f(app as any), Respondable.toResponse)]
    )
  ))

/** @internal */
export const catchAll = dual<
  <E, E2, R2>(
    f: (e: E) => Router.Route.Handler<E2, R2>
  ) => <R>(self: Router.HttpRouter<E, R>) => Router.HttpRouter<E2, R | Router.HttpRouter.ExcludeProvided<R2>>,
  <E, R, E2, R2>(
    self: Router.HttpRouter<E, R>,
    f: (e: E) => Router.Route.Handler<E2, R2>
  ) => Router.HttpRouter<E2, R | Router.HttpRouter.ExcludeProvided<R2>>
>(2, (self, f) => transform(self, Effect.catchAll(f)))

/** @internal */
export const catchAllCause = dual<
  <E, E2, R2>(
    f: (e: Cause.Cause<E>) => Router.Route.Handler<E2, R2>
  ) => <R>(self: Router.HttpRouter<E, R>) => Router.HttpRouter<E2, R | Router.HttpRouter.ExcludeProvided<R2>>,
  <E, R, E2, R2>(
    self: Router.HttpRouter<E, R>,
    f: (e: Cause.Cause<E>) => Router.Route.Handler<E2, R2>
  ) => Router.HttpRouter<E2, R | Router.HttpRouter.ExcludeProvided<R2>>
>(2, (self, f) => transform(self, Effect.catchAllCause(f)))

/** @internal */
export const catchTag = dual<
  <K extends (E extends { _tag: string } ? E["_tag"] : never), E, E1, R1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Router.Route.Handler<E1, R1>
  ) => <R>(
    self: Router.HttpRouter<E, R>
  ) => Router.HttpRouter<Exclude<E, { _tag: K }> | E1, R | Router.HttpRouter.ExcludeProvided<R1>>,
  <E, R, K extends (E extends { _tag: string } ? E["_tag"] : never), E1, R1>(
    self: Router.HttpRouter<E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Router.Route.Handler<E1, R1>
  ) => Router.HttpRouter<Exclude<E, { _tag: K }> | E1, R | Router.HttpRouter.ExcludeProvided<R1>>
>(3, (self, k, f) => transform(self, Effect.catchTag(k, f)))

/** @internal */
export const catchTags: {
  <
    E,
    Cases extends (E extends { _tag: string } ? {
        [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => Router.Route.Handler<any, any>
      } :
      {})
  >(
    cases: Cases
  ): <R>(self: Router.HttpRouter<E, R>) => Router.HttpRouter<
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, infer E, any>) ? E : never
    }[keyof Cases],
    | R
    | Router.HttpRouter.ExcludeProvided<
      {
        [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, any, infer R>) ? R : never
      }[keyof Cases]
    >
  >
  <
    R,
    E,
    Cases extends (E extends { _tag: string } ? {
        [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => Router.Route.Handler<any, any>
      } :
      {})
  >(
    self: Router.HttpRouter<E, R>,
    cases: Cases
  ): Router.HttpRouter<
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, infer E, any>) ? E : never
    }[keyof Cases],
    | R
    | Router.HttpRouter.ExcludeProvided<
      {
        [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, any, infer R>) ? R : never
      }[keyof Cases]
    >
  >
} = dual(2, (self: Router.HttpRouter<any, any>, cases: {}) => use(self, Effect.catchTags(cases)))

export const provideService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    service: Context.Tag.Service<T>
  ) => <E, R>(
    self: Router.HttpRouter<E, R>
  ) => Router.HttpRouter<E, Exclude<R, Context.Tag.Identifier<T>>>,
  <E, R, T extends Context.Tag<any, any>>(
    self: Router.HttpRouter<E, R>,
    tag: T,
    service: Context.Tag.Service<T>
  ) => Router.HttpRouter<E, Exclude<R, Context.Tag.Identifier<T>>>
>(3, <E, R, T extends Context.Tag<any, any>>(
  self: Router.HttpRouter<E, R>,
  tag: T,
  service: Context.Tag.Service<T>
): Router.HttpRouter<E, Exclude<R, Context.Tag.Identifier<T>>> => use(self, Effect.provideService(tag, service)))

/* @internal */
export const provideServiceEffect = dual<
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    effect: Effect.Effect<Context.Tag.Service<T>, E1, R1>
  ) => <E, R>(
    self: Router.HttpRouter<E, R>
  ) => Router.HttpRouter<
    E | E1,
    Exclude<
      R | Router.HttpRouter.ExcludeProvided<R1>,
      Context.Tag.Identifier<T>
    >
  >,
  <E, R, T extends Context.Tag<any, any>, R1, E1>(
    self: Router.HttpRouter<E, R>,
    tag: T,
    effect: Effect.Effect<Context.Tag.Service<T>, E1, R1>
  ) => Router.HttpRouter<
    E | E1,
    Exclude<
      R | Router.HttpRouter.ExcludeProvided<R1>,
      Context.Tag.Identifier<T>
    >
  >
>(3, <E, R, T extends Context.Tag<any, any>, R1, E1>(
  self: Router.HttpRouter<E, R>,
  tag: T,
  effect: Effect.Effect<Context.Tag.Service<T>, E1, R1>
): Router.HttpRouter<
  E | E1,
  Exclude<
    R | Router.HttpRouter.ExcludeProvided<R1>,
    Context.Tag.Identifier<T>
  >
> => use(self, Effect.provideServiceEffect(tag, effect)) as any)

const makeService = <E, R>(): Router.HttpRouter.Service<E, R> => {
  let router = empty as Router.HttpRouter<E, R>
  return {
    addRoute(route) {
      return Effect.sync(() => {
        router = append(router, route)
      })
    },
    all(path, handler, options) {
      return Effect.sync(() => {
        router = all(router, path, handler, options)
      })
    },
    get(path, handler, options) {
      return Effect.sync(() => {
        router = get(router, path, handler, options)
      })
    },
    post(path, handler, options) {
      return Effect.sync(() => {
        router = post(router, path, handler, options)
      })
    },
    put(path, handler, options) {
      return Effect.sync(() => {
        router = put(router, path, handler, options)
      })
    },
    patch(path, handler, options) {
      return Effect.sync(() => {
        router = patch(router, path, handler, options)
      })
    },
    del(path, handler, options) {
      return Effect.sync(() => {
        router = del(router, path, handler, options)
      })
    },
    head(path, handler, options) {
      return Effect.sync(() => {
        router = head(router, path, handler, options)
      })
    },
    options(path, handler, opts) {
      return Effect.sync(() => {
        router = options(router, path, handler, opts)
      })
    },
    router: Effect.sync(() => router),
    mount(path, that) {
      return Effect.sync(() => {
        router = mount(router, path, that)
      })
    },
    mountApp(path, app, options) {
      return Effect.sync(() => {
        router = mountApp(router, path, app, options)
      })
    },
    concat(that) {
      return Effect.sync(() => {
        router = concat(router, that)
      })
    }
  }
}

/* @internal */
export const Tag =
  <const Name extends string>(id: Name) =>
  <Self, R = never, E = unknown>(): Router.HttpRouter.TagClass<
    Self,
    Name,
    E,
    R | Router.HttpRouter.DefaultServices
  > => {
    const Err = globalThis.Error as any
    const limit = Err.stackTraceLimit
    Err.stackTraceLimit = 2
    const creationError = new Err()
    Err.stackTraceLimit = limit

    function TagClass() {}
    const TagClass_ = TagClass as any as Mutable<Router.HttpRouter.TagClass<Self, Name, E, R>>
    Object.setPrototypeOf(TagClass, Object.getPrototypeOf(Context.GenericTag<Self, any>(id)))
    TagClass.key = id
    Object.defineProperty(TagClass, "stack", {
      get() {
        return creationError.stack
      }
    })
    TagClass_.Live = Layer.sync(TagClass_, makeService)
    TagClass_.router = Effect.flatMap(TagClass_, (_) => _.router)
    TagClass_.use = (f) =>
      TagClass_.pipe(
        Effect.flatMap(f),
        Layer.scopedDiscard,
        Layer.provide(TagClass_.Live)
      )
    TagClass_.unwrap = (f) =>
      TagClass_.pipe(
        Effect.flatMap((_) => _.router),
        Effect.map(f),
        Layer.unwrapEffect,
        Layer.provide(TagClass_.Live)
      )
    TagClass_.serve = (middleware) => TagClass_.unwrap(HttpServer.serve(middleware as any))
    return TagClass as any
  }
