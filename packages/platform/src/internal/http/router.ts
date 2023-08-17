import * as Chunk from "@effect/data/Chunk"
import * as Context from "@effect/data/Context"
import * as Equal from "@effect/data/Equal"
import { dual } from "@effect/data/Function"
import * as Hash from "@effect/data/Hash"
import * as Option from "@effect/data/Option"
import { pipeArguments } from "@effect/data/Pipeable"
import * as Effect from "@effect/io/Effect"
import type * as App from "@effect/platform/Http/App"
import type * as Method from "@effect/platform/Http/Method"
import type * as Router from "@effect/platform/Http/Router"
import * as Error from "@effect/platform/Http/ServerError"
import * as ServerRequest from "@effect/platform/Http/ServerRequest"
import * as Schema from "@effect/schema/Schema"
import * as Channel from "@effect/stream/Channel"
import * as Sink from "@effect/stream/Sink"
import * as Stream from "@effect/stream/Stream"
import type { HTTPMethod } from "find-my-way"
import FindMyWay from "find-my-way"

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
  return Effect.flatMap(
    RouteContext,
    (_) =>
      parse({
        ..._.searchParams,
        ..._.params
      })
  )
}

class RouterImpl<R, E> implements Router.Router<R, E> {
  readonly [TypeId]: Router.TypeId
  constructor(
    readonly routes: Chunk.Chunk<Router.Route<R, E>>,
    readonly mounts: Chunk.Chunk<readonly [string, App.Default<R, E>]>
  ) {
    this[TypeId] = TypeId
    this[Effect.EffectTypeId] = undefined
    this[Stream.StreamTypeId] = undefined
    this[Sink.SinkTypeId] = undefined
    this[Channel.ChannelTypeId] = undefined
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
  private httpApp: App.Default<Exclude<R, Router.RouteContext>, E | Error.RouteNotFound> | undefined
  commit() {
    if (this.httpApp === undefined) {
      this.httpApp = toHttpApp(this)
    }
    return this.httpApp
  }

  // implements HttpApp/Effect
  public _tag = "Commit" // OP_COMMIT
  readonly [Effect.EffectTypeId]: any
  readonly [Stream.StreamTypeId]: any
  readonly [Sink.SinkTypeId]: any
  readonly [Channel.ChannelTypeId]: any;
  [Equal.symbol](
    this: RouterImpl<R, E>,
    that: RouterImpl<R, E>
  ): boolean {
    return this === that
  }
  [Hash.symbol](this: RouterImpl<R, E>): number {
    return Hash.random(this)
  }
}

const toHttpApp = <R, E>(
  self: Router.Router<R, E>
): App.Default<Exclude<R, Router.RouteContext>, E | Error.RouteNotFound> => {
  const router = FindMyWay()
  Chunk.forEach(self.mounts, ([path, app]) => {
    const fn = () => {}
    fn.handler = Effect.updateService(app, ServerRequest.ServerRequest, (request) => sliceRequestUrl(request, path))
    router.all(path, fn)
    router.all(path + "/*", fn)
  })
  Chunk.forEach(self.routes, (route) => {
    const fn = () => {}
    fn.handler = route
    if (route.method === "*") {
      router.all(route.path, fn)
    } else {
      router.on(route.method, route.path, fn)
    }
  })
  return Effect.flatMap(
    ServerRequest.ServerRequest,
    (request): App.Default<Exclude<R, Router.RouteContext>, E | Error.RouteNotFound> => {
      const result = router.find(request.method as HTTPMethod, request.url)
      if (result === null) {
        return Effect.fail(Error.RouteNotFound({ request }))
      }
      const handler = (result.handler as any).handler
      if (RouteTypeId in handler) {
        const route = handler as Router.Route<R, E>
        if (route.prefix._tag === "Some") {
          request = sliceRequestUrl(request, route.prefix.value)
        }
        return Effect.mapInputContext(
          route.handler,
          (context) =>
            Context.add(
              Context.add(context, ServerRequest.ServerRequest, request),
              RouteContext,
              new RouteContextImpl(result.params, result.searchParams)
            ) as Context.Context<R>
        )
      }
      return (handler as App.Default<Exclude<R, Router.RouteContext>, E>)
    }
  )
}

function sliceRequestUrl(request: ServerRequest.ServerRequest, prefix: string) {
  const prefexLen = prefix.length
  return request.setUrl(request.url.length <= prefexLen ? "/" : request.url.slice(prefexLen))
}

class RouteImpl<R, E> implements Router.Route<R, E> {
  readonly [RouteTypeId]: Router.RouteTypeId
  constructor(
    readonly method: Method.Method | "*",
    readonly path: string,
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
  path: string,
  handler: Router.Route.Handler<R, E>,
  prefix: Option.Option<string> = Option.none()
): Router.Route<R, E> => new RouteImpl(method, path, handler, prefix)

/** @internal */
export const concat = dual<
  <R1, E1>(that: Router.Router<R1, E1>) => <R, E>(self: Router.Router<R, E>) => Router.Router<R | R1, E | E1>,
  <R, E, R1, E1>(self: Router.Router<R, E>, that: Router.Router<R1, E1>) => Router.Router<R | R1, E | E1>
>(2, (self, that) => new RouterImpl(Chunk.appendAll(self.routes, that.routes) as any, self.mounts))

const removeTrailingSlash = (path: string) => (path.endsWith("/") ? path.slice(0, -1) : path)

/** @internal */
export const prefixAll = dual<
  (prefix: string) => <R, E>(self: Router.Router<R, E>) => Router.Router<R, E>,
  <R, E>(self: Router.Router<R, E>, prefix: string) => Router.Router<R, E>
>(
  2,
  (self, prefix) => {
    prefix = removeTrailingSlash(prefix)
    return new RouterImpl(
      Chunk.map(self.routes, (route) =>
        new RouteImpl(
          route.method,
          route.path === "/" ? prefix : prefix + route.path,
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
    path: string,
    that: Router.Router<R1, E1>
  ) => <R, E>(self: Router.Router<R, E>) => Router.Router<R | R1, E | E1>,
  <R, E, R1, E1>(
    self: Router.Router<R, E>,
    path: string,
    that: Router.Router<R1, E1>
  ) => Router.Router<R | R1, E | E1>
>(
  3,
  (self, path, that) => concat(self, prefixAll(that, path))
)

/** @internal */
export const mountApp = dual<
  <R1, E1>(
    path: string,
    that: App.Default<R1, E1>
  ) => <R, E>(self: Router.Router<R, E>) => Router.Router<R | R1, E | E1>,
  <R, E, R1, E1>(
    self: Router.Router<R, E>,
    path: string,
    that: App.Default<R1, E1>
  ) => Router.Router<R | R1, E | E1>
>(
  3,
  (self, path, that) => new RouterImpl(self.routes, Chunk.append(self.mounts, [removeTrailingSlash(path), that]) as any)
)

/** @internal */
export const route = (method: Method.Method | "*"): {
  <R1, E1>(
    path: string,
    handler: Router.Route.Handler<R1, E1>
  ): <R, E>(self: Router.Router<R, E>) => Router.Router<R | Exclude<R1, Router.RouteContext>, E1 | E>
  <R, E, R1, E1>(
    self: Router.Router<R, E>,
    path: string,
    handler: Router.Route.Handler<R1, E1>
  ): Router.Router<R | Exclude<R1, Router.RouteContext>, E | E1>
} =>
  dual<
    <R1, E1>(
      path: string,
      handler: Router.Route.Handler<R1, E1>
    ) => <R, E>(self: Router.Router<R, E>) => Router.Router<R | Exclude<R1, Router.RouteContext>, E | E1>,
    <R, E, R1, E1>(
      self: Router.Router<R, E>,
      path: string,
      handler: Router.Route.Handler<R1, E1>
    ) => Router.Router<R | Exclude<R1, Router.RouteContext>, E | E1>
  >(3, (self, path, handler) =>
    new RouterImpl(
      Chunk.append(self.routes, new RouteImpl(method, path, handler)) as any,
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
