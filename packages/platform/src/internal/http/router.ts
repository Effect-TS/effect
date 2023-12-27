import * as Schema from "@effect/schema/Schema"
import type * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Option from "effect/Option"
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
export const RouteContext = Context.Tag<Router.RouteContext>("@effect/platform/Http/Router/RouteContext")

/** @internal */
export const params = Effect.map(RouteContext, (_) => _.params)

/** @internal */
export const searchParams = Effect.map(RouteContext, (_) => _.searchParams)

/** @internal */
export const schemaParams = <I extends Readonly<Record<string, string>>, A>(schema: Schema.Schema<I, A>) => {
  const parse = Schema.parse(schema)
  return Effect.flatMap(RouteContext, (_) => parse({ ..._.searchParams, ..._.params }))
}

/** @internal */
export const schemaPathParams = <I extends Readonly<Record<string, string>>, A>(schema: Schema.Schema<I, A>) => {
  const parse = Schema.parse(schema)
  return Effect.flatMap(RouteContext, (_) => parse(_.params))
}

/** @internal */
export const schemaSearchParams = <I extends Readonly<Record<string, string>>, A>(schema: Schema.Schema<I, A>) => {
  const parse = Schema.parse(schema)
  return Effect.flatMap(RouteContext, (_) => parse(_.searchParams))
}

class RouterImpl<R, E> extends Effectable.StructuralClass<
  Exclude<R, Router.RouteContext>,
  E | Error.RouteNotFound,
  ServerResponse.ServerResponse
> implements Router.Router<R, E> {
  readonly [TypeId]: Router.TypeId
  constructor(
    readonly routes: Chunk.Chunk<Router.Route<R, E>>,
    readonly mounts: Chunk.Chunk<readonly [string, App.Default<R, E>]>
  ) {
    super()
    this[TypeId] = TypeId
  }
  private httpApp:
    | Effect.Effect<Exclude<R, Router.RouteContext>, E | Error.RouteNotFound, ServerResponse.ServerResponse>
    | undefined
  commit() {
    if (this.httpApp === undefined) {
      this.httpApp = toHttpApp(this) as any
    }
    return this.httpApp!
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
  self: Router.Router<R, E>
): App.Default<Router.Router.ExcludeProvided<R>, E | Error.RouteNotFound> => {
  const router = FindMyWay.make<Router.Route<R, E>>()
  const mounts = Chunk.toReadonlyArray(self.mounts)
  const mountsLen = mounts.length
  Chunk.forEach(self.routes, (route) => {
    if (route.method === "*") {
      router.all(route.path, route)
    } else {
      router.on(route.method, route.path, route)
    }
  })
  return Effect.flatMap(
    ServerRequest.ServerRequest,
    (request): App.Default<Router.Router.ExcludeProvided<R>, E | Error.RouteNotFound> => {
      if (mountsLen > 0) {
        for (let i = 0; i < mountsLen; i++) {
          const [path, app] = mounts[i]
          if (request.url.startsWith(path)) {
            return Effect.provideService(
              app,
              ServerRequest.ServerRequest,
              sliceRequestUrl(request, path)
            ) as App.Default<Router.Router.ExcludeProvided<R>, E>
          }
        }
      }

      let result = router.find(request.method, request.url)
      if (result === undefined && request.method === "HEAD") {
        result = router.find("GET", request.url)
      }
      if (result === undefined) {
        return Effect.fail(Error.RouteNotFound({ request }))
      }
      const route = result.handler
      if (route.prefix._tag === "Some") {
        request = sliceRequestUrl(request, route.prefix.value)
      }
      return Effect.mapInputContext(
        route.handler as Effect.Effect<Router.Router.ExcludeProvided<R>, E, ServerResponse.ServerResponse>,
        (context) =>
          Context.add(
            Context.add(context, ServerRequest.ServerRequest, request),
            RouteContext,
            new RouteContextImpl(result!.params, result!.searchParams)
          ) as Context.Context<R>
      )
    }
  )
}

function sliceRequestUrl(request: ServerRequest.ServerRequest, prefix: string) {
  const prefexLen = prefix.length
  return request.modify({ url: request.url.length <= prefexLen ? "/" : request.url.slice(prefexLen) })
}

class RouteImpl<R, E> implements Router.Route<R, E> {
  readonly [RouteTypeId]: Router.RouteTypeId
  constructor(
    readonly method: Method.Method | "*",
    readonly path: Router.PathInput,
    readonly handler: Router.Route.Handler<R, E>,
    readonly prefix = Option.none<string>()
  ) {
    this[RouteTypeId] = RouteTypeId
  }
}

class RouteContextImpl implements Router.RouteContext {
  readonly [RouteContextTypeId]: Router.RouteContextTypeId
  constructor(
    readonly params: Readonly<Record<string, string | undefined>>,
    readonly searchParams: Readonly<Record<string, string>>
  ) {
    this[RouteContextTypeId] = RouteContextTypeId
  }
}

/** @internal */
export const empty: Router.Router<never, never> = new RouterImpl(Chunk.empty(), Chunk.empty())

/** @internal */
export const fromIterable = <R, E>(
  routes: Iterable<Router.Route<R, E>>
): Router.Router<R, E> => new RouterImpl(Chunk.fromIterable(routes), Chunk.empty())

/** @internal */
export const makeRoute = <R, E>(
  method: Method.Method,
  path: Router.PathInput,
  handler: Router.Route.Handler<R, E>,
  prefix: Option.Option<string> = Option.none()
): Router.Route<Router.Router.ExcludeProvided<R>, E> => new RouteImpl(method, path, handler, prefix) as any

/** @internal */
export const concat = dual<
  <R1, E1>(that: Router.Router<R1, E1>) => <R, E>(self: Router.Router<R, E>) => Router.Router<R | R1, E | E1>,
  <R, E, R1, E1>(self: Router.Router<R, E>, that: Router.Router<R1, E1>) => Router.Router<R | R1, E | E1>
>(2, (self, that) => new RouterImpl(Chunk.appendAll(self.routes, that.routes) as any, self.mounts))

const removeTrailingSlash = (
  path: Router.PathInput
): Router.PathInput => (path.endsWith("/") ? path.slice(0, -1) : path) as any

/** @internal */
export const prefixAll = dual<
  (prefix: Router.PathInput) => <R, E>(self: Router.Router<R, E>) => Router.Router<R, E>,
  <R, E>(self: Router.Router<R, E>, prefix: Router.PathInput) => Router.Router<R, E>
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
          )
        )),
      Chunk.map(self.mounts, ([path, app]) => [path === "/" ? prefix : prefix + path, app])
    )
  }
)

/** @internal */
export const mount = dual<
  <R1, E1>(
    path: `/${string}`,
    that: Router.Router<R1, E1>
  ) => <R, E>(self: Router.Router<R, E>) => Router.Router<R | R1, E | E1>,
  <R, E, R1, E1>(
    self: Router.Router<R, E>,
    path: `/${string}`,
    that: Router.Router<R1, E1>
  ) => Router.Router<R | R1, E | E1>
>(
  3,
  (self, path, that) => concat(self, prefixAll(that, path))
)

/** @internal */
export const mountApp = dual<
  <R1, E1>(
    path: `/${string}`,
    that: App.Default<R1, E1>
  ) => <R, E>(
    self: Router.Router<R, E>
  ) => Router.Router<Router.Router.ExcludeProvided<R | R1>, E | E1>,
  <R, E, R1, E1>(
    self: Router.Router<R, E>,
    path: `/${string}`,
    that: App.Default<R1, E1>
  ) => Router.Router<Router.Router.ExcludeProvided<R | R1>, E | E1>
>(
  3,
  (self, path, that) =>
    new RouterImpl<any, any>(self.routes, Chunk.append(self.mounts, [removeTrailingSlash(path), that]))
)

/** @internal */
export const route = (method: Method.Method | "*"): {
  <R1, E1>(
    path: Router.PathInput,
    handler: Router.Route.Handler<R1, E1>
  ): <R, E>(
    self: Router.Router<R, E>
  ) => Router.Router<Router.Router.ExcludeProvided<R | R1>, E1 | E>
  <R, E, R1, E1>(
    self: Router.Router<R, E>,
    path: Router.PathInput,
    handler: Router.Route.Handler<R1, E1>
  ): Router.Router<Router.Router.ExcludeProvided<R | R1>, E1 | E>
} =>
  dual<
    <R1, E1>(
      path: Router.PathInput,
      handler: Router.Route.Handler<R1, E1>
    ) => <R, E>(
      self: Router.Router<R, E>
    ) => Router.Router<Router.Router.ExcludeProvided<R | R1>, E | E1>,
    <R, E, R1, E1>(
      self: Router.Router<R, E>,
      path: Router.PathInput,
      handler: Router.Route.Handler<R1, E1>
    ) => Router.Router<Router.Router.ExcludeProvided<R | R1>, E | E1>
  >(3, (self, path, handler) =>
    new RouterImpl<any, any>(
      Chunk.append(self.routes, new RouteImpl(method, path, handler)),
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
  <R, E, R1, E1>(
    f: (self: Router.Route.Handler<R, E>) => App.Default<R1, E1>
  ) => (self: Router.Router<R, E>) => Router.Router<Router.Router.ExcludeProvided<R1>, E1>,
  <R, E, R1, E1>(
    self: Router.Router<R, E>,
    f: (self: Router.Route.Handler<R, E>) => App.Default<R1, E1>
  ) => Router.Router<Router.Router.ExcludeProvided<R1>, E1>
>(2, (self, f) =>
  new RouterImpl<any, any>(
    Chunk.map(
      self.routes,
      (route) => new RouteImpl(route.method, route.path, f(route.handler) as any, route.prefix)
    ),
    Chunk.map(
      self.mounts,
      ([path, app]) => [path, f(app as any)]
    )
  ))

/** @internal */
export const catchAll = dual<
  <E, R2, E2>(
    f: (e: E) => Router.Route.Handler<R2, E2>
  ) => <R>(self: Router.Router<R, E>) => Router.Router<Router.Router.ExcludeProvided<R2 | R>, E2>,
  <R, E, R2, E2>(
    self: Router.Router<R, E>,
    f: (e: E) => Router.Route.Handler<R2, E2>
  ) => Router.Router<Router.Router.ExcludeProvided<R2 | R>, E2>
>(2, (self, f) => use(self, Effect.catchAll(f)))

/** @internal */
export const catchAllCause = dual<
  <E, R2, E2>(
    f: (e: Cause.Cause<E>) => Router.Route.Handler<R2, E2>
  ) => <R>(self: Router.Router<R, E>) => Router.Router<Router.Router.ExcludeProvided<R2 | R>, E2>,
  <R, E, R2, E2>(
    self: Router.Router<R, E>,
    f: (e: Cause.Cause<E>) => Router.Route.Handler<R2, E2>
  ) => Router.Router<Router.Router.ExcludeProvided<R2 | R>, E2>
>(2, (self, f) => use(self, Effect.catchAllCause(f)))

/** @internal */
export const catchTag = dual<
  <K extends (E extends { _tag: string } ? E["_tag"] : never), E, R1, E1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Router.Route.Handler<R1, E1>
  ) => <R>(
    self: Router.Router<R, E>
  ) => Router.Router<Router.Router.ExcludeProvided<R | R1>, Exclude<E, { _tag: K }> | E1>,
  <R, E, K extends (E extends { _tag: string } ? E["_tag"] : never), R1, E1>(
    self: Router.Router<R, E>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Router.Route.Handler<R1, E1>
  ) => Router.Router<Router.Router.ExcludeProvided<R | R1>, Exclude<E, { _tag: K }> | E1>
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
  ): <R>(self: Router.Router<R, E>) => Router.Router<
    Router.Router.ExcludeProvided<
      | R
      | {
        [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<infer R, any, any>) ? R : never
      }[keyof Cases]
    >,
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, infer E, any>) ? E : never
    }[keyof Cases]
  >
  <
    R,
    E,
    Cases extends (E extends { _tag: string } ? {
        [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => Router.Route.Handler<any, any>
      } :
      {})
  >(
    self: Router.Router<R, E>,
    cases: Cases
  ): Router.Router<
    Router.Router.ExcludeProvided<
      | R
      | {
        [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<infer R, any, any>) ? R : never
      }[keyof Cases]
    >,
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends ((...args: Array<any>) => Effect.Effect<any, infer E, any>) ? E : never
    }[keyof Cases]
  >
} = dual(2, (self: Router.Router<any, any>, cases: {}) => use(self, Effect.catchTags(cases)))

export const provideService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    service: Context.Tag.Service<T>
  ) => <R, E>(
    self: Router.Router<R, E>
  ) => Router.Router<Router.Router.ExcludeProvided<Exclude<R, Context.Tag.Identifier<T>>>, E>,
  <R, E, T extends Context.Tag<any, any>>(
    self: Router.Router<R, E>,
    tag: T,
    service: Context.Tag.Service<T>
  ) => Router.Router<Router.Router.ExcludeProvided<Exclude<R, Context.Tag.Identifier<T>>>, E>
>(3, <R, E, T extends Context.Tag<any, any>>(
  self: Router.Router<R, E>,
  tag: T,
  service: Context.Tag.Service<T>
): Router.Router<Router.Router.ExcludeProvided<Exclude<R, Context.Tag.Identifier<T>>>, E> =>
  use(self, Effect.provideService(tag, service)))

/* @internal */
export const provideServiceEffect = dual<
  <T extends Context.Tag<any, any>, R1, E1>(
    tag: T,
    effect: Effect.Effect<R1, E1, Context.Tag.Service<T>>
  ) => <R, E>(
    self: Router.Router<R, E>
  ) => Router.Router<
    Router.Router.ExcludeProvided<R1 | Exclude<R, Context.Tag.Identifier<T>>>,
    E | E1
  >,
  <R, E, T extends Context.Tag<any, any>, R1, E1>(
    self: Router.Router<R, E>,
    tag: T,
    effect: Effect.Effect<R1, E1, Context.Tag.Service<T>>
  ) => Router.Router<
    Router.Router.ExcludeProvided<R1 | Exclude<R, Context.Tag.Identifier<T>>>,
    E | E1
  >
>(3, <R, E, T extends Context.Tag<any, any>, R1, E1>(
  self: Router.Router<R, E>,
  tag: T,
  effect: Effect.Effect<R1, E1, Context.Tag.Service<T>>
) => use(self, Effect.provideServiceEffect(tag, effect)))
