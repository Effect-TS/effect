import type { ParseOptions } from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import type * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import * as FiberRef from "effect/FiberRef"
import { dual } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as FindMyWay from "find-my-way-ts"
import type * as App from "../../Http/App.js"
import type * as Method from "../../Http/Method.js"
import type * as Router from "../../Http/Router.js"
import * as Error from "../../Http/ServerError.js"
import * as ServerRequest from "../../Http/ServerRequest.js"
import type * as ServerResponse from "../../Http/ServerResponse.js"

/** @internal */
export const TypeId: Router.TypeId = Symbol.for("@effect/platform/Http/Router") as Router.TypeId

/** @internal */
export const RouteTypeId: Router.RouteTypeId = Symbol.for("@effect/platform/Http/Router/Route") as Router.RouteTypeId

/** @internal */
export const RouteContextTypeId: Router.RouteContextTypeId = Symbol.for(
  "@effect/platform/Http/Router/RouteContext"
) as Router.RouteContextTypeId

/** @internal */
export const RouteContext = Context.GenericTag<Router.RouteContext>("@effect/platform/Http/Router/RouteContext")

/** @internal */
export const params = Effect.map(RouteContext, (_) => _.params)

/** @internal */
export const searchParams = Effect.map(RouteContext, (_) => _.searchParams)

/** @internal */
export const schemaJson = <
  R,
  I extends Partial<{
    readonly method: Method.Method
    readonly url: string
    readonly cookies: Readonly<Record<string, string>>
    readonly headers: Readonly<Record<string, string>>
    readonly pathParams: Readonly<Record<string, string>>
    readonly searchParams: Readonly<Record<string, string>>
    readonly body: any
  }>,
  A
>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(
    ServerRequest.ServerRequest,
    (request) =>
      Effect.flatMap(Effect.zip(request.json, RouteContext), ([body, context]) =>
        parse({
          method: request.method,
          url: request.url,
          headers: request.headers,
          cookies: request.cookies,
          pathParams: context.params,
          searchParams: context.searchParams,
          body
        }))
  )
}

/** @internal */
export const schemaNoBody = <
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
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(
    ServerRequest.ServerRequest,
    (request) =>
      Effect.flatMap(RouteContext, (context) =>
        parse({
          method: request.method,
          url: request.url,
          headers: request.headers,
          cookies: request.cookies,
          pathParams: context.params,
          searchParams: context.searchParams
        }))
  )
}

/** @internal */
export const schemaParams = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(RouteContext, (_) => parse({ ..._.searchParams, ..._.params }))
}

/** @internal */
export const schemaPathParams = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(RouteContext, (_) => parse(_.params))
}

/** @internal */
export const schemaSearchParams = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return Effect.flatMap(RouteContext, (_) => parse(_.searchParams))
}

class RouterImpl<E = never, R = never> extends Effectable.StructuralClass<
  ServerResponse.ServerResponse,
  E | Error.RouteNotFound,
  Exclude<R, Router.RouteContext>
> implements Router.Router<E, R> {
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
    this.httpApp = toHttpApp(this) as any
  }
  private httpApp: Effect.Effect<
    ServerResponse.ServerResponse,
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
    // TODO: remove any when fix lands
    return (Inspectable as any).format(this)
  }
  [Inspectable.NodeInspectSymbol]() {
    return this.toJSON()
  }
}

const toHttpApp = <R, E>(
  self: Router.Router<E, R>
): App.Default<E | Error.RouteNotFound, R> => {
  const router = FindMyWay.make<Router.Route<E, R>>()
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
        {},
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
    ServerResponse.ServerResponse,
    E | Error.RouteNotFound,
    R | ServerRequest.ServerRequest
  >((fiber) => {
    let context = fiber.getFiberRef(FiberRef.currentContext)
    const request = Context.unsafeGet(context, ServerRequest.ServerRequest)
    if (mountsLen > 0) {
      for (let i = 0; i < mountsLen; i++) {
        const [path, routeContext, options] = mounts[i]
        if (request.url.startsWith(path)) {
          context = Context.add(context, RouteContext, routeContext)
          if (options?.includePrefix !== true) {
            context = Context.add(context, ServerRequest.ServerRequest, sliceRequestUrl(request, path))
          }
          return Effect.locally(
            routeContext.route.handler as App.Default<E, R>,
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
      context = Context.add(context, ServerRequest.ServerRequest, sliceRequestUrl(request, route.prefix.value))
    }
    context = Context.add(context, RouteContext, new RouteContextImpl(route, result.params, result.searchParams))
    return Effect.locally(
      (route.uninterruptible ?
        route.handler :
        Effect.interruptible(route.handler)) as Effect.Effect<
          ServerResponse.ServerResponse,
          E,
          Router.Router.ExcludeProvided<R>
        >,
      FiberRef.currentContext,
      context
    )
  })
}

function sliceRequestUrl(request: ServerRequest.ServerRequest, prefix: string) {
  const prefexLen = prefix.length
  return request.modify({ url: request.url.length <= prefexLen ? "/" : request.url.slice(prefexLen) })
}

class RouteImpl<E = never, R = never> extends Inspectable.Class implements Router.Route<E, R> {
  readonly [RouteTypeId]: Router.RouteTypeId
  constructor(
    readonly method: Method.Method | "*",
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
      _id: "@effect/platform/Http/Router/Route",
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
    readonly params: Readonly<Record<string, string | undefined>>,
    readonly searchParams: Readonly<Record<string, string>>
  ) {
    this[RouteContextTypeId] = RouteContextTypeId
  }
}

/** @internal */
export const empty: Router.Router<never> = new RouterImpl(Chunk.empty(), Chunk.empty())

/** @internal */
export const fromIterable = <R extends Router.Route<any, any>>(
  routes: Iterable<R>
): Router.Router<
  R extends Router.Route<infer E, infer _> ? E : never,
  R extends Router.Route<infer _, infer Env> ? Env : never
> => new RouterImpl(Chunk.fromIterable(routes), Chunk.empty()) as any

/** @internal */
export const makeRoute = <E, R>(
  method: Method.Method,
  path: Router.PathInput,
  handler: Router.Route.Handler<E, R>,
  prefix: Option.Option<string> = Option.none(),
  uninterruptible = false
): Router.Route<E, Router.Router.ExcludeProvided<R>> =>
  new RouteImpl(
    method,
    path,
    handler,
    prefix,
    uninterruptible
  ) as any

/** @internal */
export const concat = dual<
  <R1, E1>(that: Router.Router<E1, R1>) => <R, E>(self: Router.Router<E, R>) => Router.Router<E | E1, R | R1>,
  <R, E, R1, E1>(self: Router.Router<E, R>, that: Router.Router<E1, R1>) => Router.Router<E | E1, R | R1>
>(2, (self, that) => new RouterImpl(Chunk.appendAll(self.routes, that.routes) as any, self.mounts))

const removeTrailingSlash = (
  path: Router.PathInput
): Router.PathInput => (path.endsWith("/") ? path.slice(0, -1) : path) as any

/** @internal */
export const prefixAll = dual<
  (prefix: Router.PathInput) => <R, E>(self: Router.Router<E, R>) => Router.Router<E, R>,
  <R, E>(self: Router.Router<E, R>, prefix: Router.PathInput) => Router.Router<E, R>
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
    that: Router.Router<E1, R1>
  ) => <R, E>(self: Router.Router<E, R>) => Router.Router<E | E1, R | R1>,
  <R, E, R1, E1>(
    self: Router.Router<E, R>,
    path: `/${string}`,
    that: Router.Router<E1, R1>
  ) => Router.Router<E | E1, R | R1>
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
  ) => <R, E>(
    self: Router.Router<E, R>
  ) => Router.Router<E | E1, R | Router.Router.ExcludeProvided<R1>>,
  <R, E, R1, E1>(
    self: Router.Router<E, R>,
    path: `/${string}`,
    that: App.Default<E1, R1>,
    options?: {
      readonly includePrefix?: boolean | undefined
    } | undefined
  ) => Router.Router<E | E1, R | Router.Router.ExcludeProvided<R1>>
>(
  (args) => Predicate.hasProperty(args[0], TypeId),
  <R, E, R1, E1>(
    self: Router.Router<E, R>,
    path: `/${string}`,
    that: App.Default<E1, R1>,
    options?: {
      readonly includePrefix?: boolean | undefined
    } | undefined
  ): Router.Router<E | E1, R | Router.Router.ExcludeProvided<R1>> =>
    new RouterImpl<any, any>(self.routes, Chunk.append(self.mounts, [removeTrailingSlash(path), that, options])) as any
)

/** @internal */
export const route = (method: Method.Method | "*"): {
  <R1, E1>(
    path: Router.PathInput,
    handler: Router.Route.Handler<E1, R1>,
    options?: {
      readonly uninterruptible?: boolean | undefined
    } | undefined
  ): <R, E>(
    self: Router.Router<E, R>
  ) => Router.Router<E1 | E, R | Router.Router.ExcludeProvided<R1>>
  <R, E, R1, E1>(
    self: Router.Router<E, R>,
    path: Router.PathInput,
    handler: Router.Route.Handler<E1, R1>,
    options?: {
      readonly uninterruptible?: boolean | undefined
    } | undefined
  ): Router.Router<E1 | E, R | Router.Router.ExcludeProvided<R1>>
} =>
  dual<
    <R1, E1>(
      path: Router.PathInput,
      handler: Router.Route.Handler<R1, E1>
    ) => <R, E>(
      self: Router.Router<E, R>
    ) => Router.Router<E | E1, R | Router.Router.ExcludeProvided<R1>>,
    <R, E, R1, E1>(
      self: Router.Router<E, R>,
      path: Router.PathInput,
      handler: Router.Route.Handler<E1, R1>,
      options?: {
        readonly uninterruptible?: boolean | undefined
      } | undefined
    ) => Router.Router<E | E1, R | Router.Router.ExcludeProvided<R1>>
  >(3, (self, path, handler, options) =>
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
    f: (self: Router.Route.Handler<E, R>) => App.Default<E1, R1>
  ) => (self: Router.Router<E, R>) => Router.Router<E1, Router.Router.ExcludeProvided<R1>>,
  <E, R, R1, E1>(
    self: Router.Router<E, R>,
    f: (self: Router.Route.Handler<E, R>) => App.Default<E1, R1>
  ) => Router.Router<E1, Router.Router.ExcludeProvided<R1>>
>(2, (self, f) =>
  new RouterImpl<any, any>(
    Chunk.map(
      self.routes,
      (route) => new RouteImpl(route.method, route.path, f(route.handler) as any, route.prefix, route.uninterruptible)
    ),
    Chunk.map(
      self.mounts,
      ([path, app]) => [path, f(app as any)]
    )
  ))

/** @internal */
export const catchAll = dual<
  <E, E2, R2>(
    f: (e: E) => Router.Route.Handler<E2, R2>
  ) => <R>(self: Router.Router<E, R>) => Router.Router<E2, R | Router.Router.ExcludeProvided<R2>>,
  <R, E, E2, R2>(
    self: Router.Router<E, R>,
    f: (e: E) => Router.Route.Handler<E2, R2>
  ) => Router.Router<E2, R | Router.Router.ExcludeProvided<R2>>
>(2, (self, f) => use(self, Effect.catchAll(f)))

/** @internal */
export const catchAllCause = dual<
  <E, E2, R2>(
    f: (e: Cause.Cause<E>) => Router.Route.Handler<E2, R2>
  ) => <R>(self: Router.Router<E, R>) => Router.Router<E2, R | Router.Router.ExcludeProvided<R2>>,
  <R, E, E2, R2>(
    self: Router.Router<E, R>,
    f: (e: Cause.Cause<E>) => Router.Route.Handler<E2, R2>
  ) => Router.Router<E2, R | Router.Router.ExcludeProvided<R2>>
>(2, (self, f) => use(self, Effect.catchAllCause(f)))

/** @internal */
export const catchTag = dual<
  <K extends (E extends { _tag: string } ? E["_tag"] : never), E, E1, R1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Router.Route.Handler<E1, R1>
  ) => <R>(
    self: Router.Router<E, R>
  ) => Router.Router<Exclude<E, { _tag: K }> | E1, R | Router.Router.ExcludeProvided<R1>>,
  <R, E, K extends (E extends { _tag: string } ? E["_tag"] : never), E1, R1>(
    self: Router.Router<E, R>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Router.Route.Handler<E1, R1>
  ) => Router.Router<Exclude<E, { _tag: K }> | E1, R | Router.Router.ExcludeProvided<R1>>
>(3, (self, k, f) => use(self, Effect.catchTag(k, f)))

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
  ): <R>(self: Router.Router<E, R>) => Router.Router<
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, infer E, any>) ? E : never
    }[keyof Cases],
    | R
    | Router.Router.ExcludeProvided<
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
    self: Router.Router<E, R>,
    cases: Cases
  ): Router.Router<
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, infer E, any>) ? E : never
    }[keyof Cases],
    | R
    | Router.Router.ExcludeProvided<
      {
        [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, any, infer R>) ? R : never
      }[keyof Cases]
    >
  >
} = dual(2, (self: Router.Router<any, any>, cases: {}) => use(self, Effect.catchTags(cases)))

export const provideService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    service: Context.Tag.Service<T>
  ) => <R, E>(
    self: Router.Router<E, R>
  ) => Router.Router<E, Exclude<R, Context.Tag.Identifier<T>>>,
  <R, E, T extends Context.Tag<any, any>>(
    self: Router.Router<E, R>,
    tag: T,
    service: Context.Tag.Service<T>
  ) => Router.Router<E, Exclude<R, Context.Tag.Identifier<T>>>
>(3, <R, E, T extends Context.Tag<any, any>>(
  self: Router.Router<E, R>,
  tag: T,
  service: Context.Tag.Service<T>
): Router.Router<E, Exclude<R, Context.Tag.Identifier<T>>> => use(self, Effect.provideService(tag, service)))

/* @internal */
export const provideServiceEffect = dual<
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    effect: Effect.Effect<Context.Tag.Service<T>, E1, R1>
  ) => <R, E>(
    self: Router.Router<E, R>
  ) => Router.Router<
    E | E1,
    Exclude<
      R | Router.Router.ExcludeProvided<R1>,
      Context.Tag.Identifier<T>
    >
  >,
  <R, E, T extends Context.Tag<any, any>, R1, E1>(
    self: Router.Router<E, R>,
    tag: T,
    effect: Effect.Effect<Context.Tag.Service<T>, E1, R1>
  ) => Router.Router<
    E | E1,
    Exclude<
      R | Router.Router.ExcludeProvided<R1>,
      Context.Tag.Identifier<T>
    >
  >
>(3, <R, E, T extends Context.Tag<any, any>, R1, E1>(
  self: Router.Router<E, R>,
  tag: T,
  effect: Effect.Effect<Context.Tag.Service<T>, E1, R1>
): Router.Router<
  E | E1,
  Exclude<
    R | Router.Router.ExcludeProvided<R1>,
    Context.Tag.Identifier<T>
  >
> => use(self, Effect.provideServiceEffect(tag, effect)) as any)
