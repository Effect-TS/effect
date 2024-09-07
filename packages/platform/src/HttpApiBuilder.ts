/**
 * @since 1.0.0
 */
import * as AST from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as FiberRef from "effect/FiberRef"
import { identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import type { ManagedRuntime } from "effect/ManagedRuntime"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type { ReadonlyRecord } from "effect/Record"
import * as Redacted from "effect/Redacted"
import type { Scope } from "effect/Scope"
import type { Covariant, Mutable, NoInfer } from "effect/Types"
import { unify } from "effect/Unify"
import type { Cookie } from "./Cookies.js"
import type { FileSystem } from "./FileSystem.js"
import * as HttpApi from "./HttpApi.js"
import * as HttpApiEndpoint from "./HttpApiEndpoint.js"
import { HttpApiDecodeError } from "./HttpApiError.js"
import type * as HttpApiGroup from "./HttpApiGroup.js"
import * as HttpApiSchema from "./HttpApiSchema.js"
import type * as HttpApiSecurity from "./HttpApiSecurity.js"
import * as HttpApp from "./HttpApp.js"
import * as HttpMethod from "./HttpMethod.js"
import * as HttpMiddleware from "./HttpMiddleware.js"
import * as HttpRouter from "./HttpRouter.js"
import * as HttpServer from "./HttpServer.js"
import * as HttpServerRequest from "./HttpServerRequest.js"
import * as HttpServerResponse from "./HttpServerResponse.js"
import * as OpenApi from "./OpenApi.js"
import type { Path } from "./Path.js"

/**
 * The router that the API endpoints are attached to.
 *
 * @since 1.0.0
 * @category router
 */
export class Router extends HttpRouter.Tag("@effect/platform/HttpApiBuilder/Router")<Router>() {}

/**
 * Build an `HttpApp` from an `HttpApi` instance, and serve it using an
 * `HttpServer`.
 *
 * Optionally, you can provide a middleware function that will be applied to
 * the `HttpApp` before serving.
 *
 * @since 1.0.0
 * @category constructors
 */
export const serve: {
  (): Layer.Layer<never, never, HttpServer.HttpServer | HttpApi.HttpApi.Service | HttpRouter.HttpRouter.DefaultServices>
  <R>(
    middleware: (httpApp: HttpApp.Default) => HttpApp.Default<never, R>
  ): Layer.Layer<
    never,
    never,
    | HttpServer.HttpServer
    | HttpRouter.HttpRouter.DefaultServices
    | Exclude<R, Scope | HttpServerRequest.HttpServerRequest>
    | HttpApi.HttpApi.Service
  >
} = (middleware?: HttpMiddleware.HttpMiddleware.Applied<any, never, any>): Layer.Layer<
  never,
  never,
  any
> =>
  httpApp.pipe(
    Effect.map(HttpServer.serve(middleware!)),
    Layer.unwrapEffect,
    Layer.provide(Router.Live)
  )

/**
 * Construct an `HttpApp` from an `HttpApi` instance.
 *
 * @since 1.0.0
 * @category constructors
 */
export const httpApp: Effect.Effect<
  HttpApp.Default<never, HttpRouter.HttpRouter.DefaultServices>,
  never,
  Router | HttpApi.HttpApi.Service
> = Effect.gen(function*() {
  const api = yield* HttpApi.HttpApi
  const router = yield* Router.router
  const apiMiddleware = yield* Effect.serviceOption(Middleware)
  const errorSchema = makeErrorSchema(api as any)
  const encodeError = Schema.encodeUnknown(errorSchema)
  return router.pipe(
    apiMiddleware._tag === "Some" ? apiMiddleware.value : identity,
    Effect.catchAll((error) =>
      Effect.matchEffect(encodeError(error), {
        onFailure: () => Effect.die(error),
        onSuccess: Effect.succeed
      })
    )
  )
})

/**
 * Construct an http web handler from an `HttpApi` instance.
 *
 * @since 1.0.0
 * @category constructors
 * @example
 * import { HttpApi } from "@effect/platform"
 * import { Etag, HttpApiBuilder, HttpMiddleware, HttpPlatform } from "@effect/platform"
 * import { NodeContext } from "@effect/platform-node"
 * import { Layer, ManagedRuntime } from "effect"
 *
 * const ApiLive = HttpApiBuilder.api(HttpApi.empty)
 *
 * const runtime = ManagedRuntime.make(
 *   Layer.mergeAll(
 *     ApiLive,
 *     HttpApiBuilder.Router.Live,
 *     HttpPlatform.layer,
 *     Etag.layerWeak
 *   ).pipe(
 *     Layer.provideMerge(NodeContext.layer)
 *   )
 * )
 *
 * const handler = HttpApiBuilder.toWebHandler(runtime, HttpMiddleware.logger)
 */
export const toWebHandler = <R, ER>(
  runtime: ManagedRuntime<R | HttpApi.HttpApi.Service | Router | HttpRouter.HttpRouter.DefaultServices, ER>,
  middleware?: (
    httpApp: HttpApp.Default
  ) => HttpApp.Default<never, R | HttpApi.HttpApi.Service | Router | HttpRouter.HttpRouter.DefaultServices>
): (request: Request) => Promise<Response> => {
  const handlerPromise = httpApp.pipe(
    Effect.bindTo("httpApp"),
    Effect.bind("runtime", () => runtime.runtimeEffect),
    Effect.map(({ httpApp, runtime }) =>
      HttpApp.toWebHandlerRuntime(runtime)(middleware ? middleware(httpApp as any) : httpApp)
    ),
    runtime.runPromise
  )
  return (request) => handlerPromise.then((handler) => handler(request))
}

/**
 * Build a root level `Layer` from an `HttpApi` instance.
 *
 * The `Layer` will provide the `HttpApi` service, and will require the
 * implementation for all the `HttpApiGroup`'s contained in the `HttpApi`.
 *
 * The resulting `Layer` can be provided to the `HttpApiBuilder.serve` layer.
 *
 * @since 1.0.0
 * @category constructors
 */
export const api = <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR>(
  self: HttpApi.HttpApi<Groups, Error, ErrorR>
): Layer.Layer<HttpApi.HttpApi.Service, never, HttpApiGroup.HttpApiGroup.ToService<Groups> | ErrorR> =>
  Layer.succeed(HttpApi.HttpApi, self) as any

/**
 * @since 1.0.0
 * @category handlers
 */
export const HandlersTypeId: unique symbol = Symbol.for("@effect/platform/HttpApiBuilder/Handlers")

/**
 * @since 1.0.0
 * @category handlers
 */
export type HandlersTypeId = typeof HandlersTypeId

/**
 * Represents a handled, or partially handled, `HttpApiGroup`.
 *
 * @since 1.0.0
 * @category handlers
 */
export interface Handlers<
  E,
  R,
  Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All = never
> extends Pipeable {
  readonly [HandlersTypeId]: {
    _Endpoints: Covariant<Endpoints>
  }
  readonly group: HttpApiGroup.HttpApiGroup<any, HttpApiEndpoint.HttpApiEndpoint.All, any, R>
  readonly handlers: Chunk.Chunk<Handlers.Item<E, R>>
}

/**
 * @since 1.0.0
 * @category handlers
 */
export declare namespace Handlers {
  /**
   * @since 1.0.0
   * @category handlers
   */
  export type Middleware<E, R, E1, R1> = (self: HttpRouter.Route.Middleware<E, R>) => HttpApp.Default<E1, R1>

  /**
   * @since 1.0.0
   * @category handlers
   */
  export type Item<E, R> = {
    readonly _tag: "Handler"
    readonly endpoint: HttpApiEndpoint.HttpApiEndpoint.Any
    readonly handler: HttpApiEndpoint.HttpApiEndpoint.Handler<any, E, R>
    readonly withFullResponse: boolean
  } | {
    readonly _tag: "Middleware"
    readonly middleware: Middleware<any, any, E, R>
  }
}

const HandlersProto = {
  [HandlersTypeId]: {
    _Endpoints: identity
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeHandlers = <E, R, Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All>(
  options: {
    readonly group: HttpApiGroup.HttpApiGroup<any, HttpApiEndpoint.HttpApiEndpoint.All, any, R>
    readonly handlers: Chunk.Chunk<Handlers.Item<E, R>>
  }
): Handlers<E, R, Endpoints> => {
  const self = Object.create(HandlersProto)
  self.group = options.group
  self.handlers = options.handlers
  return self
}

/**
 * Create a `Layer` that will implement all the endpoints in an `HttpApiGroup`.
 *
 * An unimplemented `Handlers` instance is passed to the `build` function, which
 * you can use to add handlers to the group.
 *
 * You can implement endpoints using the `HttpApiBuilder.handle` api.
 *
 * @since 1.0.0
 * @category handlers
 */
export const group = <
  Groups extends HttpApiGroup.HttpApiGroup.Any,
  ApiError,
  ApiErrorR,
  const Name extends Groups["identifier"],
  RH,
  EX = never,
  RX = never
>(
  api: HttpApi.HttpApi<Groups, ApiError, ApiErrorR>,
  groupName: Name,
  build: (
    handlers: Handlers<never, never, HttpApiGroup.HttpApiGroup.EndpointsWithName<Groups, Name>>
  ) =>
    | Handlers<NoInfer<ApiError> | HttpApiGroup.HttpApiGroup.ErrorWithName<Groups, Name>, RH>
    | Effect.Effect<Handlers<NoInfer<ApiError> | HttpApiGroup.HttpApiGroup.ErrorWithName<Groups, Name>, RH>, EX, RX>
): Layer.Layer<
  HttpApiGroup.HttpApiGroup.Service<Name>,
  EX,
  RX | RH | HttpApiGroup.HttpApiGroup.ContextWithName<Groups, Name> | ApiErrorR
> =>
  Router.use((router) =>
    Effect.gen(function*() {
      const context = yield* Effect.context<any>()
      const group = Chunk.findFirst(api.groups, (group) => group.identifier === groupName)
      if (group._tag === "None") {
        throw new Error(`Group "${groupName}" not found in API`)
      }
      const result = build(makeHandlers({ group: group.value as any, handlers: Chunk.empty() }))
      const handlers = Effect.isEffect(result) ? (yield* result) : result
      const routes: Array<HttpRouter.Route<any, any>> = []
      for (const item of handlers.handlers) {
        if (item._tag === "Middleware") {
          for (const route of routes) {
            ;(route as Mutable<HttpRouter.Route<any, any>>).handler = item.middleware(route.handler as any)
          }
        } else {
          routes.push(handlerToRoute(
            item.endpoint,
            function(request) {
              return Effect.mapInputContext(
                item.handler(request),
                (input) => Context.merge(context, input)
              )
            },
            item.withFullResponse
          ))
        }
      }
      yield* router.concat(HttpRouter.fromIterable(routes))
    })
  ) as any

/**
 * Add the implementation for an `HttpApiEndpoint` to a `Handlers` group.
 *
 * @since 1.0.0
 * @category handlers
 */
export const handle: {
  <Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, const Name extends Endpoints["name"], E, R>(
    name: Name,
    handler: HttpApiEndpoint.HttpApiEndpoint.HandlerWithName<Endpoints, Name, E, R>
  ): <EG, RG>(self: Handlers<EG, RG, Endpoints>) => Handlers<
    EG | Exclude<E, HttpApiEndpoint.HttpApiEndpoint.ErrorWithName<Endpoints, Name>> | HttpApiDecodeError,
    RG | HttpApiEndpoint.HttpApiEndpoint.ExcludeProvided<R>,
    HttpApiEndpoint.HttpApiEndpoint.ExcludeName<Endpoints, Name>
  >
  <Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, const Name extends Endpoints["name"], E, R>(
    name: Name,
    handler: HttpApiEndpoint.HttpApiEndpoint.HandlerResponseWithName<Endpoints, Name, E, R>,
    options: {
      readonly withFullResponse: true
    }
  ): <EG, RG>(self: Handlers<EG, RG, Endpoints>) => Handlers<
    EG | Exclude<E, HttpApiEndpoint.HttpApiEndpoint.ErrorWithName<Endpoints, Name>> | HttpApiDecodeError,
    RG | HttpApiEndpoint.HttpApiEndpoint.ExcludeProvided<R>,
    HttpApiEndpoint.HttpApiEndpoint.ExcludeName<Endpoints, Name>
  >
} = <Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, const Name extends Endpoints["name"], E, R>(
  name: Name,
  handler: HttpApiEndpoint.HttpApiEndpoint.HandlerWithName<Endpoints, Name, E, R>,
  options?: {
    readonly withFullResponse: true
  }
) =>
<EG, RG>(
  self: Handlers<EG, RG, Endpoints>
): Handlers<
  EG | Exclude<E, HttpApiEndpoint.HttpApiEndpoint.ErrorWithName<Endpoints, Name>> | HttpApiDecodeError,
  RG | HttpApiEndpoint.HttpApiEndpoint.ExcludeProvided<R>,
  HttpApiEndpoint.HttpApiEndpoint.ExcludeName<Endpoints, Name>
> => {
  const o = Chunk.findFirst(self.group.endpoints, (endpoint) => endpoint.name === name)
  if (o._tag === "None") {
    throw new Error(`Endpoint "${name}" not found in group "${self.group.identifier}"`)
  }
  const endpoint = o.value
  return makeHandlers({
    group: self.group,
    handlers: Chunk.append(self.handlers, {
      _tag: "Handler",
      endpoint,
      handler,
      withFullResponse: options?.withFullResponse === true
    }) as any
  })
}

/**
 * Add `HttpMiddleware` to a `Handlers` group.
 *
 * Any errors are required to have a corresponding schema in the API.
 * You can add middleware errors to an `HttpApiGroup` using the `HttpApiGroup.addError`
 * api.
 *
 * @since 1.0.0
 * @category middleware
 */
export const middleware =
  <E, R, E1, R1>(middleware: Handlers.Middleware<E, R, E1, R1>) =>
  <Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All>(
    self: Handlers<E, R, Endpoints>
  ): Handlers<E1, HttpApiEndpoint.HttpApiEndpoint.ExcludeProvided<R1>, Endpoints> =>
    makeHandlers<E1, HttpApiEndpoint.HttpApiEndpoint.ExcludeProvided<R1>, Endpoints>({
      ...self as any,
      handlers: Chunk.append(self.handlers, {
        _tag: "Middleware",
        middleware
      })
    })

/**
 * @since 1.0.0
 * @category middleware
 */
export class Middleware extends Context.Tag("@effect/platform/HttpApiBuilder/Middleware")<
  Middleware,
  HttpMiddleware.HttpMiddleware
>() {}

/**
 * @since 1.0.0
 * @category middleware
 */
export declare namespace ApiMiddleware {
  /**
   * @since 1.0.0
   * @category middleware
   */
  export type Fn<Error, R = HttpRouter.HttpRouter.Provided> = (
    httpApp: HttpApp.Default
  ) => HttpApp.Default<Error, R>
}

const middlewareAdd = (middleware: HttpMiddleware.HttpMiddleware): Effect.Effect<HttpMiddleware.HttpMiddleware> =>
  Effect.map(
    Effect.context<never>(),
    (context) => {
      const current = Context.getOption(context, Middleware)
      const withContext: HttpMiddleware.HttpMiddleware = (httpApp) =>
        Effect.mapInputContext(middleware(httpApp), (input) => Context.merge(context, input))
      return current._tag === "None" ? withContext : (httpApp) => withContext(current.value(httpApp))
    }
  )

const middlewareAddNoContext = (
  middleware: HttpMiddleware.HttpMiddleware
): Effect.Effect<HttpMiddleware.HttpMiddleware> =>
  Effect.map(
    Effect.serviceOption(Middleware),
    (current): HttpMiddleware.HttpMiddleware => {
      return current._tag === "None" ? middleware : (httpApp) => middleware(current.value(httpApp))
    }
  )

/**
 * Create an `HttpApi` level middleware `Layer`.
 *
 * @since 1.0.0
 * @category middleware
 */
export const middlewareLayer: {
  <EX = never, RX = never>(
    middleware: ApiMiddleware.Fn<never> | Effect.Effect<ApiMiddleware.Fn<never>, EX, RX>,
    options?: {
      readonly withContext?: false | undefined
    }
  ): Layer.Layer<never, EX, RX>
  <R, EX = never, RX = never>(
    middleware: ApiMiddleware.Fn<never, R> | Effect.Effect<ApiMiddleware.Fn<never, R>, EX, RX>,
    options: {
      readonly withContext: true
    }
  ): Layer.Layer<never, EX, HttpRouter.HttpRouter.ExcludeProvided<R> | RX>
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, EX = never, RX = never>(
    api: HttpApi.HttpApi<Groups, Error, ErrorR>,
    middleware: ApiMiddleware.Fn<NoInfer<Error>> | Effect.Effect<ApiMiddleware.Fn<NoInfer<Error>>, EX, RX>,
    options?: {
      readonly withContext?: false | undefined
    }
  ): Layer.Layer<never, EX, RX>
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, R, EX = never, RX = never>(
    api: HttpApi.HttpApi<Groups, Error, ErrorR>,
    middleware: ApiMiddleware.Fn<NoInfer<Error>, R> | Effect.Effect<ApiMiddleware.Fn<NoInfer<Error>, R>, EX, RX>,
    options: {
      readonly withContext: true
    }
  ): Layer.Layer<never, EX, HttpRouter.HttpRouter.ExcludeProvided<R> | RX>
} = (
  ...args: [
    middleware: ApiMiddleware.Fn<any, any> | Effect.Effect<ApiMiddleware.Fn<any, any>, any, any>,
    options?: {
      readonly withContext?: boolean | undefined
    } | undefined
  ] | [
    api: HttpApi.HttpApi.Any,
    middleware: ApiMiddleware.Fn<any, any> | Effect.Effect<ApiMiddleware.Fn<any, any>, any, any>,
    options?: {
      readonly withContext?: boolean | undefined
    } | undefined
  ]
): any => {
  const apiFirst = HttpApi.isHttpApi(args[0])
  const withContext = apiFirst ? args[2]?.withContext === true : (args as any)[1]?.withContext === true
  const add = withContext ? middlewareAdd : middlewareAddNoContext
  const middleware = apiFirst ? args[1] : args[0]
  return Effect.isEffect(middleware)
    ? Layer.effect(Middleware, Effect.flatMap(middleware as any, add))
    : Layer.effect(Middleware, add(middleware as any))
}

/**
 * Create an `HttpApi` level middleware `Layer`, that has a `Scope` provided to
 * the constructor.
 *
 * @since 1.0.0
 * @category middleware
 */
export const middlewareLayerScoped: {
  <EX, RX>(
    middleware: Effect.Effect<ApiMiddleware.Fn<never>, EX, RX>,
    options?: {
      readonly withContext?: false | undefined
    }
  ): Layer.Layer<never, EX, Exclude<RX, Scope>>
  <R, EX, RX>(
    middleware: Effect.Effect<ApiMiddleware.Fn<never, R>, EX, RX>,
    options: {
      readonly withContext: true
    }
  ): Layer.Layer<never, EX, HttpRouter.HttpRouter.ExcludeProvided<R> | Exclude<RX, Scope>>
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, EX, RX>(
    api: HttpApi.HttpApi<Groups, Error, ErrorR>,
    middleware: Effect.Effect<ApiMiddleware.Fn<NoInfer<Error>>, EX, RX>,
    options?: {
      readonly withContext?: false | undefined
    }
  ): Layer.Layer<never, EX, Exclude<RX, Scope>>
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, R, EX, RX>(
    api: HttpApi.HttpApi<Groups, Error, ErrorR>,
    middleware: Effect.Effect<ApiMiddleware.Fn<NoInfer<Error>, R>, EX, RX>,
    options: {
      readonly withContext: true
    }
  ): Layer.Layer<never, EX, HttpRouter.HttpRouter.ExcludeProvided<R> | Exclude<RX, Scope>>
} = (
  ...args: [
    middleware: ApiMiddleware.Fn<any, any> | Effect.Effect<ApiMiddleware.Fn<any, any>, any, any>,
    options?: {
      readonly withContext?: boolean | undefined
    } | undefined
  ] | [
    api: HttpApi.HttpApi.Any,
    middleware: ApiMiddleware.Fn<any, any> | Effect.Effect<ApiMiddleware.Fn<any, any>, any, any>,
    options?: {
      readonly withContext?: boolean | undefined
    } | undefined
  ]
): any => {
  const apiFirst = HttpApi.isHttpApi(args[0])
  const withContext = apiFirst ? args[2]?.withContext === true : (args as any)[1]?.withContext === true
  const add = withContext ? middlewareAdd : middlewareAddNoContext
  const middleware = apiFirst ? args[1] : args[0]
  return Layer.scoped(Middleware, Effect.flatMap(middleware as any, add))
}

/**
 * A CORS middleware layer that can be provided to the `HttpApiBuilder.serve` layer.
 *
 * @since 1.0.0
 * @category middleware
 */
export const middlewareCors = (
  options?: {
    readonly allowedOrigins?: ReadonlyArray<string> | undefined
    readonly allowedMethods?: ReadonlyArray<string> | undefined
    readonly allowedHeaders?: ReadonlyArray<string> | undefined
    readonly exposedHeaders?: ReadonlyArray<string> | undefined
    readonly maxAge?: number | undefined
    readonly credentials?: boolean | undefined
  } | undefined
): Layer.Layer<never> => middlewareLayer(HttpMiddleware.cors(options))

/**
 * A middleware that adds an openapi.json endpoint to the API.
 *
 * @since 1.0.0
 * @category middleware
 */
export const middlewareOpenApi = (
  options?: {
    readonly path?: HttpRouter.PathInput | undefined
  } | undefined
): Layer.Layer<never, never, HttpApi.HttpApi.Service> =>
  Router.use((router) =>
    Effect.gen(function*() {
      const api = yield* HttpApi.HttpApi
      const spec = OpenApi.fromApi(api)
      const response = yield* HttpServerResponse.json(spec).pipe(
        Effect.orDie
      )
      yield* router.get(options?.path ?? "/openapi.json", Effect.succeed(response))
    })
  )

/**
 * @since 1.0.0
 * @category middleware
 */
export interface SecurityMiddleware<I, EM = never, RM = never> {
  <Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, E, R>(
    self: Handlers<E, R, Endpoints>
  ): Handlers<E | EM, Exclude<R, I> | HttpApiEndpoint.HttpApiEndpoint.ExcludeProvided<RM>, Endpoints>
}

const bearerLen = `Bearer `.length

/**
 * @since 1.0.0
 * @category middleware
 */
export const securityDecode = <Security extends HttpApiSecurity.HttpApiSecurity>(
  self: Security
): Effect.Effect<
  HttpApiSecurity.HttpApiSecurity.Type<Security>,
  never,
  HttpServerRequest.HttpServerRequest | HttpServerRequest.ParsedSearchParams
> => {
  switch (self._tag) {
    case "Bearer": {
      return Effect.map(
        HttpServerRequest.HttpServerRequest,
        (request) => Redacted.make((request.headers.authorization ?? "").slice(bearerLen)) as any
      )
    }
    case "ApiKey": {
      const schema = Schema.Struct({
        [self.key]: Schema.String
      })
      const decode = unify(
        self.in === "query"
          ? HttpServerRequest.schemaSearchParams(schema)
          : self.in === "cookie"
          ? HttpServerRequest.schemaCookies(schema)
          : HttpServerRequest.schemaHeaders(schema)
      )
      return Effect.match(decode, {
        onFailure: () => Redacted.make("") as any,
        onSuccess: (match) => Redacted.make(match[self.key])
      })
    }
    case "Basic": {
      const empty: HttpApiSecurity.HttpApiSecurity.Type<Security> = {
        username: "",
        password: Redacted.make("")
      } as any
      return HttpServerRequest.HttpServerRequest.pipe(
        Effect.flatMap((request) => Encoding.decodeBase64String(request.headers.authorization ?? "")),
        Effect.match({
          onFailure: () => empty,
          onSuccess: (header) => {
            const parts = header.split(":")
            if (parts.length !== 2) {
              return empty
            }
            return {
              username: parts[0],
              password: Redacted.make(parts[1])
            } as any
          }
        })
      )
    }
  }
}

/**
 * Set a cookie from an `HttpApiSecurity.HttpApiKey` instance.
 *
 * You can use this api before returning a response from an endpoint handler.
 *
 * ```ts
 * ApiBuilder.handle(
 *   "authenticate",
 *   (_) => ApiBuilder.securitySetCookie(security, "secret123")
 * )
 * ```
 *
 * @since 1.0.0
 * @category middleware
 */
export const securitySetCookie = (
  self: HttpApiSecurity.ApiKey,
  value: string | Redacted.Redacted,
  options?: Cookie["options"]
): Effect.Effect<void> => {
  const stringValue = typeof value === "string" ? value : Redacted.value(value)
  return HttpApp.appendPreResponseHandler((_req, response) =>
    Effect.orDie(
      HttpServerResponse.setCookie(response, self.key, stringValue, {
        secure: true,
        httpOnly: true,
        ...options
      })
    )
  )
}

/**
 * Make a middleware from an `HttpApiSecurity` instance, that can be used when
 * constructing a `Handlers` group.
 *
 * @since 1.0.0
 * @category middleware
 * @example
 * import { HttpApiBuilder, HttpApiSecurity } from "@effect/platform"
 * import { Schema } from "@effect/schema"
 * import { Context, Effect, Redacted } from "effect"
 *
 * class User extends Schema.Class<User>("User")({
 *   id: Schema.Number
 * }) {}
 *
 * class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}
 *
 * class Accounts extends Context.Tag("Accounts")<Accounts, {
 *   readonly findUserByAccessToken: (accessToken: string) => Effect.Effect<User>
 * }>() {}
 *
 * const securityMiddleware = Effect.gen(function*() {
 *   const accounts = yield* Accounts
 *   return HttpApiBuilder.middlewareSecurity(
 *     HttpApiSecurity.bearer,
 *     CurrentUser,
 *     (token) => accounts.findUserByAccessToken(Redacted.value(token))
 *   )
 * })
 */
export const middlewareSecurity = <Security extends HttpApiSecurity.HttpApiSecurity, I, S, EM, RM>(
  self: Security,
  tag: Context.Tag<I, S>,
  f: (
    credentials: HttpApiSecurity.HttpApiSecurity.Type<Security>
  ) => Effect.Effect<S, EM, RM>
): SecurityMiddleware<I, EM, RM> =>
  middleware(Effect.provideServiceEffect(
    tag,
    Effect.flatMap(securityDecode(self), f)
  )) as SecurityMiddleware<I, EM, RM>

/**
 * Make a middleware from an `HttpApiSecurity` instance, that can be used when
 * constructing a `Handlers` group.
 *
 * This version does not supply any context to the handlers.
 *
 * @since 1.0.0
 * @category middleware
 */
export const middlewareSecurityVoid = <Security extends HttpApiSecurity.HttpApiSecurity, X, EM, RM>(
  self: Security,
  f: (
    credentials: HttpApiSecurity.HttpApiSecurity.Type<Security>
  ) => Effect.Effect<X, EM, RM>
): SecurityMiddleware<never, EM, RM> =>
  middleware((httpApp) =>
    securityDecode(self).pipe(
      Effect.flatMap(f),
      Effect.zipRight(httpApp)
    )
  ) as SecurityMiddleware<never, EM, RM>

// internal

const requestPayload = (
  request: HttpServerRequest.HttpServerRequest,
  urlParams: ReadonlyRecord<string, string | Array<string>>,
  isMultipart: boolean
): Effect.Effect<
  unknown,
  never,
  | FileSystem
  | Path
  | Scope
> =>
  HttpMethod.hasBody(request.method)
    ? isMultipart
      ? Effect.orDie(request.multipart)
      : Effect.orDie(request.json)
    : Effect.succeed(urlParams)

const handlerToRoute = (
  endpoint: HttpApiEndpoint.HttpApiEndpoint.Any,
  handler: HttpApiEndpoint.HttpApiEndpoint.Handler<any, any, any>,
  isFullResponse: boolean
): HttpRouter.Route<any, any> => {
  const decodePath = Option.map(endpoint.pathSchema, Schema.decodeUnknown)
  const isMultipart = endpoint.payloadSchema.pipe(
    Option.map((schema) => HttpApiSchema.getMultipart(schema.ast)),
    Option.getOrElse(() => false)
  )
  const decodePayload = Option.map(endpoint.payloadSchema, Schema.decodeUnknown)
  const decodeHeaders = Option.map(endpoint.headersSchema, Schema.decodeUnknown)
  const encoding = HttpApiSchema.getEncoding(endpoint.successSchema.ast)
  const successStatus = HttpApiSchema.getStatusSuccess(endpoint.successSchema)
  const encodeSuccess = Option.map(HttpApiEndpoint.schemaSuccess(endpoint), (schema) => {
    const encode = Schema.encodeUnknown(schema)
    switch (encoding.kind) {
      case "Json": {
        return (body: unknown) =>
          Effect.orDie(
            Effect.flatMap(encode(body), (json) =>
              HttpServerResponse.json(json, {
                status: successStatus,
                contentType: encoding.contentType
              }))
          )
      }
      case "Text": {
        return (body: unknown) =>
          Effect.map(Effect.orDie(encode(body)), (text) =>
            HttpServerResponse.text(text as any, {
              status: successStatus,
              contentType: encoding.contentType
            }))
      }
      case "Uint8Array": {
        return (body: unknown) =>
          Effect.map(Effect.orDie(encode(body)), (data) =>
            HttpServerResponse.uint8Array(data as any, {
              status: successStatus,
              contentType: encoding.contentType
            }))
      }
      case "UrlParams": {
        return (body: unknown) =>
          Effect.map(Effect.orDie(encode(body)), (params) =>
            HttpServerResponse.urlParams(params as any, {
              status: successStatus,
              contentType: encoding.contentType
            }))
      }
    }
  })
  return HttpRouter.makeRoute(
    endpoint.method,
    endpoint.path,
    Effect.withFiberRuntime((fiber) => {
      const context = fiber.getFiberRef(FiberRef.currentContext)
      const request = Context.unsafeGet(context, HttpServerRequest.HttpServerRequest)
      const routeContext = Context.unsafeGet(context, HttpRouter.RouteContext)
      const urlParams = Context.unsafeGet(context, HttpServerRequest.ParsedSearchParams)
      return (decodePath._tag === "Some"
        ? Effect.catchAll(decodePath.value(routeContext.params), HttpApiDecodeError.refailParseError)
        : Effect.succeed(routeContext.params)).pipe(
          Effect.bindTo("pathParams"),
          decodePayload._tag === "Some"
            ? Effect.bind("payload", (_) =>
              requestPayload(request, urlParams, isMultipart).pipe(
                Effect.orDie,
                Effect.flatMap((raw) => Effect.catchAll(decodePayload.value(raw), HttpApiDecodeError.refailParseError))
              ))
            : identity,
          decodeHeaders._tag === "Some"
            ? Effect.bind("headers", (_) => Effect.orDie(decodeHeaders.value(request.headers)))
            : identity,
          Effect.flatMap((input) => {
            const request: any = { path: input.pathParams }
            if ("payload" in input) {
              request.payload = input.payload
            }
            if ("headers" in input) {
              request.headers = input.headers
            }
            return handler(request)
          }),
          isFullResponse ?
            identity as (_: any) => Effect.Effect<HttpServerResponse.HttpServerResponse> :
            encodeSuccess._tag === "Some"
            ? Effect.flatMap(encodeSuccess.value)
            : Effect.as(HttpServerResponse.empty({ status: successStatus }))
        )
    })
  )
}

const astCache = globalValue(
  "@effect/platform/HttpApiBuilder/astCache",
  () => new WeakMap<AST.AST, Schema.Schema.Any>()
)

const makeErrorSchema = (
  api: HttpApi.HttpApi<HttpApiGroup.HttpApiGroup<string, HttpApiEndpoint.HttpApiEndpoint.Any>, any, any>
): Schema.Schema<unknown, HttpServerResponse.HttpServerResponse> => {
  const schemas = new Set<Schema.Schema.Any>()
  function processSchema(schema: Schema.Schema.Any): void {
    if (astCache.has(schema.ast)) {
      schemas.add(astCache.get(schema.ast)!)
      return
    }
    const ast = schema.ast
    if (ast._tag === "Union") {
      for (const astType of ast.types) {
        const errorSchema = Schema.make(astType).annotations({
          ...ast.annotations,
          ...astType.annotations
        })
        astCache.set(astType, errorSchema)
        schemas.add(errorSchema)
      }
    } else {
      astCache.set(ast, schema)
      schemas.add(schema)
    }
  }
  processSchema(api.errorSchema)
  for (const group of api.groups) {
    for (const endpoint of group.endpoints) {
      processSchema(endpoint.errorSchema)
    }
    processSchema(group.errorSchema)
  }
  return Schema.Union(...[...schemas].map((schema) => {
    const status = HttpApiSchema.getStatusError(schema)
    const encoded = AST.encodedAST(schema.ast)
    const isEmpty = encoded._tag === "VoidKeyword"
    return Schema.transformOrFail(Schema.Any, schema, {
      decode: (_, __, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, _, "Encode only schema")),
      encode: (error, _, ast) =>
        isEmpty ?
          HttpServerResponse.empty({ status }) :
          HttpServerResponse.json(error, { status }).pipe(
            Effect.mapError((error) => new ParseResult.Type(ast, error, "Could not encode to JSON"))
          )
    })
  })) as any
}
