/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as Fiber from "effect/Fiber"
import { identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type { ReadonlyRecord } from "effect/Record"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import type { Scope } from "effect/Scope"
import type { Covariant, NoInfer } from "effect/Types"
import { unify } from "effect/Unify"
import type { Cookie } from "./Cookies.js"
import type { FileSystem } from "./FileSystem.js"
import * as HttpApi from "./HttpApi.js"
import type * as HttpApiEndpoint from "./HttpApiEndpoint.js"
import { HttpApiDecodeError } from "./HttpApiError.js"
import type * as HttpApiGroup from "./HttpApiGroup.js"
import * as HttpApiMiddleware from "./HttpApiMiddleware.js"
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
 * Create a top-level `HttpApi` layer.
 *
 * @since 1.0.0
 * @category constructors
 */
export const api = <Groups extends HttpApiGroup.HttpApiGroup.Any, E, R>(
  api: HttpApi.HttpApi<Groups, E, R>
): Layer.Layer<
  HttpApi.Api,
  never,
  HttpApiGroup.HttpApiGroup.ToService<Groups> | R | HttpApiGroup.HttpApiGroup.ErrorContext<Groups>
> =>
  Layer.effect(
    HttpApi.Api,
    Effect.map(Effect.context(), (context) => ({ api: api as any, context }))
  )

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
export const serve = <R = never>(
  middleware?: (httpApp: HttpApp.Default) => HttpApp.Default<never, R>
): Layer.Layer<
  never,
  never,
  | HttpServer.HttpServer
  | HttpRouter.HttpRouter.DefaultServices
  | Exclude<R, Scope | HttpServerRequest.HttpServerRequest>
  | HttpApi.Api
> =>
  httpApp.pipe(
    Effect.map((app) => HttpServer.serve(app as any, middleware!)),
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
  Router | HttpApi.Api
> = Effect.gen(function*() {
  const { api, context } = yield* HttpApi.Api
  const middleware = makeMiddlewareMap(api.middlewares, context)
  const router = applyMiddleware(middleware, yield* Router.router)
  const apiMiddleware = yield* Effect.serviceOption(Middleware)
  const errorSchema = makeErrorSchema(api as any)
  const encodeError = Schema.encodeUnknown(errorSchema)
  return router.pipe(
    apiMiddleware._tag === "Some" ? apiMiddleware.value : identity,
    Effect.catchAll((error) =>
      Effect.matchEffect(Effect.provide(encodeError(error), context), {
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
 * import { HttpApi, HttpApiBuilder, HttpServer } from "@effect/platform"
 * import { Layer } from "effect"
 *
 * class MyApi extends HttpApi.empty {}
 *
 * const MyApiLive = HttpApiBuilder.api(MyApi)
 *
 * const { dispose, handler } = HttpApiBuilder.toWebHandler(
 *   Layer.mergeAll(
 *     MyApiLive,
 *     // you could also use NodeHttpServer.layerContext, depending on your
 *     // server's platform
 *     HttpServer.layerContext
 *   )
 * )
 */
export const toWebHandler = <LA, LE>(
  layer: Layer.Layer<LA | HttpApi.Api | HttpRouter.HttpRouter.DefaultServices, LE>,
  options?: {
    readonly middleware?: (
      httpApp: HttpApp.Default
    ) => HttpApp.Default<
      never,
      HttpApi.Api | Router | HttpRouter.HttpRouter.DefaultServices
    >
    readonly memoMap?: Layer.MemoMap
  }
): {
  readonly handler: (request: Request) => Promise<Response>
  readonly dispose: () => Promise<void>
} => {
  const runtime = ManagedRuntime.make(
    Layer.merge(layer, Router.Live),
    options?.memoMap
  )
  let handlerCached: ((request: Request) => Promise<Response>) | undefined
  const handlerPromise = Effect.gen(function*() {
    const app = yield* httpApp
    const rt = yield* runtime.runtimeEffect
    const handler = HttpApp.toWebHandlerRuntime(rt)(options?.middleware ? options.middleware(app as any) as any : app)
    handlerCached = handler
    return handler
  }).pipe(runtime.runPromise)
  function handler(request: Request): Promise<Response> {
    if (handlerCached !== undefined) {
      return handlerCached(request)
    }
    return handlerPromise.then((handler) => handler(request))
  }
  return { handler, dispose: runtime.dispose } as const
}

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
 * Represents a handled `HttpApi`.
 *
 * @since 1.0.0
 * @category handlers
 */
export interface Handlers<
  E,
  Provides,
  R,
  Endpoints extends HttpApiEndpoint.HttpApiEndpoint.Any = never
> extends Pipeable {
  readonly [HandlersTypeId]: {
    _Endpoints: Covariant<Endpoints>
  }
  readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps
  readonly handlers: Chunk.Chunk<Handlers.Item<E, R>>

  /**
   * Add the implementation for an `HttpApiEndpoint` to a `Handlers` group.
   */
  handle<Name extends HttpApiEndpoint.HttpApiEndpoint.Name<Endpoints>, R1>(
    name: Name,
    handler: HttpApiEndpoint.HttpApiEndpoint.HandlerWithName<Endpoints, Name, E, R1>
  ): Handlers<
    E,
    Provides,
    | R
    | Exclude<
      HttpApiEndpoint.HttpApiEndpoint.ExcludeProvided<
        Endpoints,
        Name,
        R1 | HttpApiEndpoint.HttpApiEndpoint.ContextWithName<Endpoints, Name>
      >,
      Provides
    >,
    HttpApiEndpoint.HttpApiEndpoint.ExcludeName<Endpoints, Name>
  >

  /**
   * Add the implementation for an `HttpApiEndpoint` to a `Handlers` group.
   * This version of the api allows you to return the full response object.
   */
  handleRaw<Name extends HttpApiEndpoint.HttpApiEndpoint.Name<Endpoints>, R1>(
    name: Name,
    handler: HttpApiEndpoint.HttpApiEndpoint.HandlerResponseWithName<Endpoints, Name, E, R1>
  ): Handlers<
    E,
    Provides,
    | R
    | Exclude<
      HttpApiEndpoint.HttpApiEndpoint.ExcludeProvided<
        Endpoints,
        Name,
        R1 | HttpApiEndpoint.HttpApiEndpoint.ContextWithName<Endpoints, Name>
      >,
      Provides
    >,
    HttpApiEndpoint.HttpApiEndpoint.ExcludeName<Endpoints, Name>
  >
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
  export interface Any {
    readonly [HandlersTypeId]: any
  }

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
    readonly endpoint: HttpApiEndpoint.HttpApiEndpoint.Any
    readonly handler: HttpApiEndpoint.HttpApiEndpoint.Handler<any, E, R>
    readonly withFullResponse: boolean
  }

  /**
   * @since 1.0.0
   * @category handlers
   */
  export type FromGroup<
    ApiError,
    ApiR,
    Group extends HttpApiGroup.HttpApiGroup.Any
  > = Handlers<
    | ApiError
    | HttpApiGroup.HttpApiGroup.Error<Group>,
    | HttpApiMiddleware.HttpApiMiddleware.ExtractProvides<ApiR>
    | HttpApiGroup.HttpApiGroup.Provides<Group>,
    never,
    HttpApiGroup.HttpApiGroup.Endpoints<Group>
  >

  /**
   * @since 1.0.0
   * @category handlers
   */
  export type ValidateReturn<A> = A extends (
    | Handlers<
      infer _E,
      infer _Provides,
      infer _R,
      infer _Endpoints
    >
    | Effect.Effect<
      Handlers<
        infer _E,
        infer _Provides,
        infer _R,
        infer _Endpoints
      >,
      infer _EX,
      infer _RX
    >
  ) ? [_Endpoints] extends [never] ? A
    : `Endpoint not handled: ${HttpApiEndpoint.HttpApiEndpoint.Name<_Endpoints>}` :
    `Must return the implemented handlers`

  /**
   * @since 1.0.0
   * @category handlers
   */
  export type Error<A> = A extends Effect.Effect<
    Handlers<
      infer _E,
      infer _Provides,
      infer _R,
      infer _Endpoints
    >,
    infer _EX,
    infer _RX
  > ? _EX :
    never

  /**
   * @since 1.0.0
   * @category handlers
   */
  export type Context<A> = A extends Handlers<
    infer _E,
    infer _Provides,
    infer _R,
    infer _Endpoints
  > ? _R :
    A extends Effect.Effect<
      Handlers<
        infer _E,
        infer _Provides,
        infer _R,
        infer _Endpoints
      >,
      infer _EX,
      infer _RX
    > ? _R | _RX :
    never
}

const HandlersProto = {
  [HandlersTypeId]: {
    _Endpoints: identity
  },
  pipe() {
    return pipeArguments(this, arguments)
  },
  handle(
    this: Handlers<any, any, any, HttpApiEndpoint.HttpApiEndpoint.Any>,
    name: string,
    handler: HttpApiEndpoint.HttpApiEndpoint.Handler<any, any, any>
  ) {
    const endpoint = HashMap.unsafeGet(this.group.endpoints, name)
    return makeHandlers({
      group: this.group,
      handlers: Chunk.append(this.handlers, {
        endpoint,
        handler,
        withFullResponse: false
      }) as any
    })
  },
  handleRaw(
    this: Handlers<any, any, any, HttpApiEndpoint.HttpApiEndpoint.Any>,
    name: string,
    handler: HttpApiEndpoint.HttpApiEndpoint.Handler<any, any, any>
  ) {
    const endpoint = HashMap.unsafeGet(this.group.endpoints, name)
    return makeHandlers({
      group: this.group,
      handlers: Chunk.append(this.handlers, {
        endpoint,
        handler,
        withFullResponse: true
      }) as any
    })
  }
}

const makeHandlers = <E, Provides, R, Endpoints extends HttpApiEndpoint.HttpApiEndpoint.Any>(
  options: {
    readonly group: HttpApiGroup.HttpApiGroup.Any
    readonly handlers: Chunk.Chunk<Handlers.Item<E, R>>
  }
): Handlers<E, Provides, R, Endpoints> => {
  const self = Object.create(HandlersProto)
  self.group = options.group
  self.handlers = options.handlers
  return self
}

/**
 * Create a `Layer` that will implement all the endpoints in an `HttpApi`.
 *
 * An unimplemented `Handlers` instance is passed to the `build` function, which
 * you can use to add handlers to the group.
 *
 * You can implement endpoints using the `handlers.handle` api.
 *
 * @since 1.0.0
 * @category handlers
 */
export const group = <
  Groups extends HttpApiGroup.HttpApiGroup.Any,
  ApiError,
  ApiR,
  const Name extends HttpApiGroup.HttpApiGroup.Name<Groups>,
  Return
>(
  api: HttpApi.HttpApi<Groups, ApiError, ApiR>,
  groupName: Name,
  build: (
    handlers: Handlers.FromGroup<ApiError, ApiR, HttpApiGroup.HttpApiGroup.WithName<Groups, Name>>
  ) => Handlers.ValidateReturn<Return>
): Layer.Layer<
  HttpApiGroup.Group<Name>,
  Handlers.Error<Return>,
  | Handlers.Context<Return>
  | HttpApiGroup.HttpApiGroup.ContextWithName<Groups, Name>
> =>
  Router.use((router) =>
    Effect.gen(function*() {
      const context = yield* Effect.context<any>()
      const group = HashMap.unsafeGet(api.groups, groupName)
      const result = build(makeHandlers({ group, handlers: Chunk.empty() }))
      const handlers: Handlers<any, any, any> = Effect.isEffect(result)
        ? (yield* result as Effect.Effect<any, any, any>)
        : result
      const groupMiddleware = makeMiddlewareMap((group as any).middlewares, context)
      const routes: Array<HttpRouter.Route<any, any>> = []
      for (const item of handlers.handlers) {
        const middleware = makeMiddlewareMap((item as any).endpoint.middlewares, context, groupMiddleware)
        routes.push(handlerToRoute(
          item.endpoint,
          middleware,
          function(request) {
            return Effect.mapInputContext(
              item.handler(request),
              (input) => Context.merge(context, input)
            )
          },
          item.withFullResponse
        ))
      }
      yield* router.concat(HttpRouter.fromIterable(routes))
    })
  ) as any

/**
 * Create a `Handler` for a single endpoint.
 *
 * @since 1.0.0
 * @category handlers
 */
export const handler = <
  Groups extends HttpApiGroup.HttpApiGroup.Any,
  ApiError,
  ApiR,
  const GroupName extends Groups["identifier"],
  const Name extends HttpApiGroup.HttpApiGroup.EndpointsWithName<Groups, GroupName>["name"],
  R
>(
  _api: HttpApi.HttpApi<Groups, ApiError, ApiR>,
  _groupName: GroupName,
  _name: Name,
  f: HttpApiEndpoint.HttpApiEndpoint.HandlerWithName<
    HttpApiGroup.HttpApiGroup.EndpointsWithName<Groups, GroupName>,
    Name,
    | ApiError
    | HttpApiGroup.HttpApiGroup.ErrorWithName<Groups, GroupName>,
    R
  >
): HttpApiEndpoint.HttpApiEndpoint.HandlerWithName<
  HttpApiGroup.HttpApiGroup.EndpointsWithName<Groups, GroupName>,
  Name,
  | ApiError
  | HttpApiGroup.HttpApiGroup.ErrorWithName<Groups, GroupName>,
  R
> => f

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

type MiddlewareMap = Map<string, {
  readonly tag: HttpApiMiddleware.TagClassAny
  readonly effect: Effect.Effect<any, any, any>
}>

const makeMiddlewareMap = (
  middleware: HashSet.HashSet<HttpApiMiddleware.TagClassAny>,
  context: Context.Context<never>,
  initial?: MiddlewareMap
): MiddlewareMap => {
  const map = new Map<string, {
    readonly tag: HttpApiMiddleware.TagClassAny
    readonly effect: Effect.Effect<any, any, any>
  }>(initial)
  HashSet.forEach(middleware, (tag) => {
    map.set(tag.key, {
      tag,
      effect: Context.unsafeGet(context, tag as any)
    })
  })
  return map
}

const handlerToRoute = (
  endpoint_: HttpApiEndpoint.HttpApiEndpoint.Any,
  middleware: MiddlewareMap,
  handler: HttpApiEndpoint.HttpApiEndpoint.Handler<any, any, any>,
  isFullResponse: boolean
): HttpRouter.Route<any, any> => {
  const endpoint = endpoint_ as HttpApiEndpoint.HttpApiEndpoint.AnyWithProps
  const decodePath = Option.map(endpoint.pathSchema, Schema.decodeUnknown)
  const isMultipart = endpoint.payloadSchema.pipe(
    Option.map((schema) => HttpApiSchema.getMultipart(schema.ast)),
    Option.getOrElse(() => false)
  )
  const decodePayload = Option.map(endpoint.payloadSchema, Schema.decodeUnknown)
  const decodeHeaders = Option.map(endpoint.headersSchema, Schema.decodeUnknown)
  const decodeUrlParams = Option.map(endpoint.urlParamsSchema, Schema.decodeUnknown)
  const encodeSuccess = Schema.encode(makeSuccessSchema(endpoint.successSchema))
  return HttpRouter.makeRoute(
    endpoint.method,
    endpoint.path,
    applyMiddleware(
      middleware,
      Effect.gen(function*() {
        const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
        const context = fiber.currentContext
        const httpRequest = Context.unsafeGet(context, HttpServerRequest.HttpServerRequest)
        const routeContext = Context.unsafeGet(context, HttpRouter.RouteContext)
        const urlParams = Context.unsafeGet(context, HttpServerRequest.ParsedSearchParams)
        const request: any = {}
        if (decodePath._tag === "Some") {
          request.path = yield* decodePath.value(routeContext.params)
        }
        if (decodePayload._tag === "Some") {
          request.payload = yield* Effect.flatMap(
            requestPayload(httpRequest, urlParams, isMultipart),
            decodePayload.value
          )
        }
        if (decodeHeaders._tag === "Some") {
          request.headers = yield* decodeHeaders.value(httpRequest.headers)
        }
        if (decodeUrlParams._tag === "Some") {
          request.urlParams = yield* decodeUrlParams.value(urlParams)
        }
        const response = isFullResponse
          ? yield* handler(request)
          : yield* Effect.flatMap(handler(request), encodeSuccess)
        return response as HttpServerResponse.HttpServerResponse
      }).pipe(
        Effect.catchIf(ParseResult.isParseError, HttpApiDecodeError.refailParseError)
      )
    )
  )
}

const applyMiddleware = <A extends Effect.Effect<any, any, any>>(
  middleware: MiddlewareMap,
  handler: A
) => {
  for (const entry of middleware.values()) {
    const effect = HttpApiMiddleware.SecurityTypeId in entry.tag ? makeSecurityMiddleware(entry as any) : entry.effect
    if (entry.tag.optional) {
      const previous = handler
      handler = Effect.matchEffect(effect, {
        onFailure: () => previous,
        onSuccess: entry.tag.provides !== undefined
          ? (value) => Effect.provideService(previous, entry.tag.provides as any, value)
          : (_) => previous
      }) as any
    } else {
      handler = entry.tag.provides !== undefined
        ? Effect.provideServiceEffect(handler, entry.tag.provides as any, effect) as any
        : Effect.zipRight(effect, handler) as any
    }
  }
  return handler
}

const securityMiddlewareCache = globalValue<WeakMap<any, Effect.Effect<any, any, any>>>(
  "securityMiddlewareCache",
  () => new WeakMap()
)

const makeSecurityMiddleware = (
  entry: {
    readonly tag: HttpApiMiddleware.TagClassSecurityAny
    readonly effect: Record<string, (_: any) => Effect.Effect<any, any>>
  }
): Effect.Effect<any, any, any> => {
  if (securityMiddlewareCache.has(entry.tag)) {
    return securityMiddlewareCache.get(entry.tag)!
  }

  let effect: Effect.Effect<any, any, any> | undefined
  for (const [key, security] of Object.entries(entry.tag.security)) {
    const decode = securityDecode(security)
    const handler = entry.effect[key]
    const middleware = Effect.flatMap(decode, handler)
    effect = effect === undefined ? middleware : Effect.catchAll(effect, () => middleware)
  }
  if (effect === undefined) {
    effect = Effect.void
  }
  securityMiddlewareCache.set(entry.tag, effect)
  return effect
}

const responseSchema = Schema.declare(HttpServerResponse.isServerResponse)

const makeSuccessSchema = (
  schema: Schema.Schema.Any
): Schema.Schema<unknown, HttpServerResponse.HttpServerResponse> => {
  const schemas = new Set<Schema.Schema.Any>()
  HttpApiSchema.deunionize(schemas, schema)
  return Schema.Union(...Array.from(schemas, toResponseSuccess)) as any
}

const makeErrorSchema = (
  api: HttpApi.HttpApi.AnyWithProps
): Schema.Schema<unknown, HttpServerResponse.HttpServerResponse> => {
  const schemas = new Set<Schema.Schema.Any>()
  HttpApiSchema.deunionize(schemas, api.errorSchema)
  HashMap.forEach(api.groups, (group) => {
    HashMap.forEach(group.endpoints, (endpoint) => {
      HttpApiSchema.deunionize(schemas, endpoint.errorSchema)
    })
    HttpApiSchema.deunionize(schemas, group.errorSchema)
  })
  return Schema.Union(...Array.from(schemas, toResponseError)) as any
}

const decodeForbidden = <A>(_: A, __: AST.ParseOptions, ast: AST.Transformation) =>
  ParseResult.fail(new ParseResult.Forbidden(ast, _, "Encode only schema"))

const toResponseSchema = (getStatus: (ast: AST.AST) => number) => {
  const cache = new WeakMap<AST.AST, Schema.Schema.All>()
  const schemaToResponse = (
    data: any,
    _: AST.ParseOptions,
    ast: AST.Transformation
  ): Effect.Effect<HttpServerResponse.HttpServerResponse, ParseResult.ParseIssue> => {
    const isEmpty = HttpApiSchema.isVoid(ast.to)
    const status = getStatus(ast.to)
    if (isEmpty) {
      return HttpServerResponse.empty({ status })
    }
    const encoding = HttpApiSchema.getEncoding(ast.to)
    switch (encoding.kind) {
      case "Json": {
        return Effect.mapError(
          HttpServerResponse.json(data, {
            status,
            contentType: encoding.contentType
          }),
          (error) => new ParseResult.Type(ast, error, "Could not encode to JSON")
        )
      }
      case "Text": {
        return ParseResult.succeed(HttpServerResponse.text(data as any, {
          status,
          contentType: encoding.contentType
        }))
      }
      case "Uint8Array": {
        return ParseResult.succeed(HttpServerResponse.uint8Array(data as any, {
          status,
          contentType: encoding.contentType
        }))
      }
      case "UrlParams": {
        return ParseResult.succeed(HttpServerResponse.urlParams(data as any, {
          status,
          contentType: encoding.contentType
        }))
      }
    }
  }
  return <A, I, R>(schema: Schema.Schema<A, I, R>): Schema.Schema<A, HttpServerResponse.HttpServerResponse, R> => {
    if (cache.has(schema.ast)) {
      return cache.get(schema.ast)! as any
    }
    const transform = Schema.transformOrFail(responseSchema, schema, {
      decode: decodeForbidden,
      encode: schemaToResponse
    })
    cache.set(transform.ast, transform)
    return transform
  }
}

const toResponseSuccess = toResponseSchema(HttpApiSchema.getStatusSuccessAST)
const toResponseError = toResponseSchema(HttpApiSchema.getStatusErrorAST)

// ----------------------------------------------------------------------------
// Global middleware
// ----------------------------------------------------------------------------

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
 * @category global
 */
export type MiddlewareFn<Error, R = HttpRouter.HttpRouter.Provided> = (
  httpApp: HttpApp.Default
) => HttpApp.Default<Error, R>

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
export const middleware: {
  <EX = never, RX = never>(
    middleware: MiddlewareFn<never> | Effect.Effect<MiddlewareFn<never>, EX, RX>,
    options?: {
      readonly withContext?: false | undefined
    }
  ): Layer.Layer<never, EX, RX>
  <R, EX = never, RX = never>(
    middleware: MiddlewareFn<never, R> | Effect.Effect<MiddlewareFn<never, R>, EX, RX>,
    options: {
      readonly withContext: true
    }
  ): Layer.Layer<never, EX, HttpRouter.HttpRouter.ExcludeProvided<R> | RX>
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, EX = never, RX = never>(
    api: HttpApi.HttpApi<Groups, Error, ErrorR>,
    middleware: MiddlewareFn<NoInfer<Error>> | Effect.Effect<MiddlewareFn<NoInfer<Error>>, EX, RX>,
    options?: {
      readonly withContext?: false | undefined
    }
  ): Layer.Layer<never, EX, RX>
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, R, EX = never, RX = never>(
    api: HttpApi.HttpApi<Groups, Error, ErrorR>,
    middleware: MiddlewareFn<NoInfer<Error>, R> | Effect.Effect<MiddlewareFn<NoInfer<Error>, R>, EX, RX>,
    options: {
      readonly withContext: true
    }
  ): Layer.Layer<never, EX, HttpRouter.HttpRouter.ExcludeProvided<R> | RX>
} = (
  ...args: [
    middleware: MiddlewareFn<any, any> | Effect.Effect<MiddlewareFn<any, any>, any, any>,
    options?: {
      readonly withContext?: boolean | undefined
    } | undefined
  ] | [
    api: HttpApi.HttpApi.Any,
    middleware: MiddlewareFn<any, any> | Effect.Effect<MiddlewareFn<any, any>, any, any>,
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
export const middlewareScoped: {
  <EX, RX>(
    middleware: Effect.Effect<MiddlewareFn<never>, EX, RX>,
    options?: {
      readonly withContext?: false | undefined
    }
  ): Layer.Layer<never, EX, Exclude<RX, Scope>>
  <R, EX, RX>(
    middleware: Effect.Effect<MiddlewareFn<never, R>, EX, RX>,
    options: {
      readonly withContext: true
    }
  ): Layer.Layer<never, EX, HttpRouter.HttpRouter.ExcludeProvided<R> | Exclude<RX, Scope>>
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, EX, RX>(
    api: HttpApi.HttpApi<Groups, Error, ErrorR>,
    middleware: Effect.Effect<MiddlewareFn<NoInfer<Error>>, EX, RX>,
    options?: {
      readonly withContext?: false | undefined
    }
  ): Layer.Layer<never, EX, Exclude<RX, Scope>>
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, R, EX, RX>(
    api: HttpApi.HttpApi<Groups, Error, ErrorR>,
    middleware: Effect.Effect<MiddlewareFn<NoInfer<Error>, R>, EX, RX>,
    options: {
      readonly withContext: true
    }
  ): Layer.Layer<never, EX, HttpRouter.HttpRouter.ExcludeProvided<R> | Exclude<RX, Scope>>
} = (
  ...args: [
    middleware: MiddlewareFn<any, any> | Effect.Effect<MiddlewareFn<any, any>, any, any>,
    options?: {
      readonly withContext?: boolean | undefined
    } | undefined
  ] | [
    api: HttpApi.HttpApi.Any,
    middleware: MiddlewareFn<any, any> | Effect.Effect<MiddlewareFn<any, any>, any, any>,
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
): Layer.Layer<never> => middleware(HttpMiddleware.cors(options))

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
): Layer.Layer<never, never, HttpApi.Api> =>
  Router.use((router) =>
    Effect.gen(function*() {
      const { api } = yield* HttpApi.Api
      const spec = OpenApi.fromApi(api)
      const response = yield* HttpServerResponse.json(spec).pipe(
        Effect.orDie
      )
      yield* router.get(options?.path ?? "/openapi.json", Effect.succeed(response))
    })
  )

const bearerLen = `Bearer `.length
const basicLen = `Basic `.length

/**
 * @since 1.0.0
 * @category security
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
        Effect.flatMap((request) => Encoding.decodeBase64String((request.headers.authorization ?? "").slice(basicLen))),
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
 * handlers.handle(
 *   "authenticate",
 *   (_) => HttpApiBuilder.securitySetCookie(security, "secret123")
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
