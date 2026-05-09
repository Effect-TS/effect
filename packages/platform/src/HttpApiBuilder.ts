/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as Fiber from "effect/Fiber"
import { constFalse, identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type * as Predicate from "effect/Predicate"
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
import * as Multipart from "./Multipart.js"
import * as OpenApi from "./OpenApi.js"
import type { Path } from "./Path.js"
import * as UrlParams from "./UrlParams.js"

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
export const api = <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, E, R>(
  api: HttpApi.HttpApi<Id, Groups, E, R>
): Layer.Layer<
  HttpApi.Api,
  never,
  HttpApiGroup.HttpApiGroup.ToService<Id, Groups> | R | HttpApiGroup.HttpApiGroup.ErrorContext<Groups>
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
    Layer.provide([Router.Live, Middleware.layer])
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
  Router | HttpApi.Api | Middleware
> = Effect.gen(function*() {
  const { api, context } = yield* HttpApi.Api
  const middleware = makeMiddlewareMap(api.middlewares, context)
  const router = applyMiddleware(middleware, yield* HttpRouter.toHttpApp(yield* Router.router))
  const apiMiddlewareService = yield* Middleware
  const apiMiddleware = yield* apiMiddlewareService.retrieve
  const errorSchema = makeErrorSchema(api as any)
  const encodeError = Schema.encodeUnknown(errorSchema)
  return router.pipe(
    apiMiddleware,
    Effect.catchAllCause((cause) =>
      Effect.matchEffect(Effect.provide(encodeError(Cause.squash(cause)), context), {
        onFailure: () => Effect.failCause(cause),
        onSuccess: Effect.succeed
      })
    )
  ) as any
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const buildMiddleware: <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, E, R>(
  api: HttpApi.HttpApi<Id, Groups, E, R>
) => Effect.Effect<
  (
    effect: Effect.Effect<HttpServerResponse.HttpServerResponse, unknown>
  ) => Effect.Effect<HttpServerResponse.HttpServerResponse, unknown, never>
> = Effect.fnUntraced(
  function*<Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, E, R>(
    api: HttpApi.HttpApi<Id, Groups, E, R>
  ) {
    const context = yield* Effect.context<never>()
    const middlewareMap = makeMiddlewareMap(api.middlewares, context)
    const errorSchema = makeErrorSchema(api as any)
    const encodeError = Schema.encodeUnknown(errorSchema)
    return (effect: Effect.Effect<HttpServerResponse.HttpServerResponse, unknown>) =>
      Effect.catchAllCause(
        applyMiddleware(middlewareMap, effect),
        (cause) =>
          Effect.matchEffect(Effect.provide(encodeError(Cause.squash(cause)), context), {
            onFailure: () => Effect.failCause(cause),
            onSuccess: Effect.succeed
          })
      )
  }
)

/**
 * Construct an http web handler from an `HttpApi` instance.
 *
 * **Example**
 *
 * ```ts
 * import { HttpApi, HttpApiBuilder, HttpServer } from "@effect/platform"
 * import { Layer } from "effect"
 *
 * class MyApi extends HttpApi.make("api") {}
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
 * ```
 *
 * @since 1.0.0
 * @category constructors
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
  readonly handler: (request: Request, context?: Context.Context<never> | undefined) => Promise<Response>
  readonly dispose: () => Promise<void>
} => {
  const layerMerged = Layer.mergeAll(layer, Router.Live, Middleware.layer)
  return HttpApp.toWebHandlerLayerWith(layerMerged, {
    memoMap: options?.memoMap,
    middleware: options?.middleware as any,
    toHandler: (r) => Effect.provide(httpApp, r)
  })
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
    handler: HttpApiEndpoint.HttpApiEndpoint.HandlerWithName<Endpoints, Name, E, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
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
    handler: HttpApiEndpoint.HttpApiEndpoint.HandlerRawWithName<Endpoints, Name, E, R1>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
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
    readonly withFullRequest: boolean
    readonly uninterruptible: boolean
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
    handler: HttpApiEndpoint.HttpApiEndpoint.Handler<any, any, any>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ) {
    const endpoint = this.group.endpoints[name]
    return makeHandlers({
      group: this.group,
      handlers: Chunk.append(this.handlers, {
        endpoint,
        handler,
        withFullRequest: false,
        uninterruptible: options?.uninterruptible ?? false
      }) as any
    })
  },
  handleRaw(
    this: Handlers<any, any, any, HttpApiEndpoint.HttpApiEndpoint.Any>,
    name: string,
    handler: HttpApiEndpoint.HttpApiEndpoint.Handler<any, any, any>,
    options?: { readonly uninterruptible?: boolean | undefined } | undefined
  ) {
    const endpoint = this.group.endpoints[name]
    return makeHandlers({
      group: this.group,
      handlers: Chunk.append(this.handlers, {
        endpoint,
        handler,
        withFullRequest: true,
        uninterruptible: options?.uninterruptible ?? false
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
  ApiId extends string,
  Groups extends HttpApiGroup.HttpApiGroup.Any,
  ApiError,
  ApiR,
  const Name extends HttpApiGroup.HttpApiGroup.Name<Groups>,
  Return
>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
  groupName: Name,
  build: (
    handlers: Handlers.FromGroup<ApiError, ApiR, HttpApiGroup.HttpApiGroup.WithName<Groups, Name>>
  ) => Handlers.ValidateReturn<Return>
): Layer.Layer<
  HttpApiGroup.ApiGroup<ApiId, Name>,
  Handlers.Error<Return>,
  Exclude<
    | Handlers.Context<Return>
    | HttpApiGroup.HttpApiGroup.MiddlewareWithName<Groups, Name>,
    Scope
  >
> =>
  Router.use((router) =>
    Effect.gen(function*() {
      const context = yield* Effect.context<any>()
      const group = api.groups[groupName]!
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
          item.withFullRequest,
          item.uninterruptible
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
  ApiId extends string,
  Groups extends HttpApiGroup.HttpApiGroup.Any,
  ApiError,
  ApiR,
  const GroupName extends Groups["identifier"],
  const Name extends HttpApiGroup.HttpApiGroup.EndpointsWithName<Groups, GroupName>["name"],
  R
>(
  _api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
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
  multipartLimits: Option.Option<Multipart.withLimits.Options>
): Effect.Effect<
  unknown,
  never,
  | FileSystem
  | Path
  | Scope
> => {
  if (!HttpMethod.hasBody(request.method)) {
    return Effect.succeed(urlParams)
  }
  const contentType = request.headers["content-type"]
    ? request.headers["content-type"].toLowerCase().trim()
    : "application/json"
  if (contentType.includes("application/json")) {
    return Effect.orDie(request.json)
  } else if (contentType.includes("multipart/form-data")) {
    return Effect.orDie(Option.match(multipartLimits, {
      onNone: () => request.multipart,
      onSome: (limits) => Multipart.withLimits(request.multipart, limits)
    }))
  } else if (contentType.includes("x-www-form-urlencoded")) {
    return Effect.map(Effect.orDie(request.urlParamsBody), UrlParams.toRecord)
  } else if (contentType.startsWith("text/")) {
    return Effect.orDie(request.text)
  }
  return Effect.map(Effect.orDie(request.arrayBuffer), (buffer) => new Uint8Array(buffer))
}

type MiddlewareMap = Map<string, {
  readonly tag: HttpApiMiddleware.TagClassAny
  readonly effect: Effect.Effect<any, any, any>
}>

const makeMiddlewareMap = (
  middleware: ReadonlySet<HttpApiMiddleware.TagClassAny>,
  context: Context.Context<never>,
  initial?: MiddlewareMap
): MiddlewareMap => {
  const map = new Map<string, {
    readonly tag: HttpApiMiddleware.TagClassAny
    readonly effect: Effect.Effect<any, any, any>
  }>(initial)
  middleware.forEach((tag) => {
    map.set(tag.key, {
      tag,
      effect: Context.unsafeGet(context, tag as any)
    })
  })
  return map
}

function isSingleStringType(ast: AST.AST, key?: PropertyKey): boolean {
  switch (ast._tag) {
    case "StringKeyword":
    case "Literal":
    case "TemplateLiteral":
    case "Enums":
      return true
    case "TypeLiteral": {
      if (key !== undefined) {
        const ps = ast.propertySignatures.find((ps) => ps.name === key)
        return ps !== undefined
          ? isSingleStringType(ps.type, key)
          : ast.indexSignatures.some((is) => Schema.is(Schema.make(is.parameter))(key) && isSingleStringType(is.type))
      }
      return false
    }
    case "Union":
      return ast.types.some((type) => isSingleStringType(type, key))
    case "Suspend":
      return isSingleStringType(ast.f(), key)
    case "Refinement":
    case "Transformation":
      return isSingleStringType(ast.from, key)
  }
  return false
}

/**
 * Normalizes the url parameters so that if a key is expected to be an array,
 * a single string value is wrapped in an array.
 *
 * @internal
 */
export function normalizeUrlParams(
  params: ReadonlyRecord<string, string | Array<string>>,
  ast: AST.AST
): ReadonlyRecord<string, string | Array<string>> {
  const out: Record<string, string | Array<string>> = {}
  for (const key in params) {
    const value = params[key]
    out[key] = Array.isArray(value) || isSingleStringType(ast, key) ? value : [value]
  }
  return out
}

const handlerToRoute = (
  endpoint_: HttpApiEndpoint.HttpApiEndpoint.Any,
  middleware: MiddlewareMap,
  handler: HttpApiEndpoint.HttpApiEndpoint.Handler<any, any, any>,
  isFullRequest: boolean,
  uninterruptible: boolean
): HttpRouter.Route<any, any> => {
  const endpoint = endpoint_ as HttpApiEndpoint.HttpApiEndpoint.AnyWithProps
  const isMultipartStream = endpoint.payloadSchema.pipe(
    Option.map(({ ast }) => HttpApiSchema.getMultipartStream(ast) !== undefined),
    Option.getOrElse(constFalse)
  )
  const multipartLimits = endpoint.payloadSchema.pipe(
    Option.flatMapNullable(({ ast }) => HttpApiSchema.getMultipart(ast) || HttpApiSchema.getMultipartStream(ast))
  )
  const decodePath = Option.map(endpoint.pathSchema, Schema.decodeUnknown)
  const decodePayload = isFullRequest || isMultipartStream
    ? Option.none()
    : Option.map(endpoint.payloadSchema, Schema.decodeUnknown)
  const decodeHeaders = Option.map(endpoint.headersSchema, Schema.decodeUnknown)
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
        const request: any = { request: httpRequest }
        if (decodePath._tag === "Some") {
          request.path = yield* decodePath.value(routeContext.params)
        }
        if (decodePayload._tag === "Some") {
          request.payload = yield* Effect.flatMap(
            requestPayload(httpRequest, urlParams, multipartLimits),
            decodePayload.value
          )
        } else if (isMultipartStream) {
          request.payload = Option.match(multipartLimits, {
            onNone: () => httpRequest.multipartStream,
            onSome: (limits) => Multipart.withLimitsStream(httpRequest.multipartStream, limits)
          })
        }
        if (decodeHeaders._tag === "Some") {
          request.headers = yield* decodeHeaders.value(httpRequest.headers)
        }
        if (endpoint.urlParamsSchema._tag === "Some") {
          const schema = endpoint.urlParamsSchema.value
          request.urlParams = yield* Schema.decodeUnknown(schema)(normalizeUrlParams(urlParams, schema.ast))
        }
        const response = yield* handler(request)
        return HttpServerResponse.isServerResponse(response) ? response : yield* encodeSuccess(response)
      }).pipe(
        Effect.catchIf(ParseResult.isParseError, HttpApiDecodeError.refailParseError)
      )
    ),
    { uninterruptible }
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
  if (securityMiddlewareCache.has(entry)) {
    return securityMiddlewareCache.get(entry)!
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
  securityMiddlewareCache.set(entry, effect)
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
  for (const group of Object.values(api.groups)) {
    for (const endpoint of Object.values(group.endpoints)) {
      HttpApiSchema.deunionize(schemas, endpoint.errorSchema)
    }
    HttpApiSchema.deunionize(schemas, group.errorSchema)
  }
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
  {
    readonly add: (middleware: HttpMiddleware.HttpMiddleware) => Effect.Effect<void>
    readonly retrieve: Effect.Effect<HttpMiddleware.HttpMiddleware>
  }
>() {
  /**
   * @since 1.0.0
   */
  static readonly layer = Layer.sync(Middleware, () => {
    let middleware: HttpMiddleware.HttpMiddleware = identity
    return Middleware.of({
      add: (f) =>
        Effect.sync(() => {
          const prev = middleware
          middleware = (app) => f(prev(app))
        }),
      retrieve: Effect.sync(() => middleware)
    })
  })
}

/**
 * @since 1.0.0
 * @category global
 */
export type MiddlewareFn<Error, R = HttpRouter.HttpRouter.Provided> = (
  httpApp: HttpApp.Default
) => HttpApp.Default<Error, R>

const middlewareAdd = (
  middleware: HttpMiddleware.HttpMiddleware
): Effect.Effect<void, never, Middleware> =>
  Effect.gen(function*() {
    const context = yield* Effect.context<never>()
    const service = yield* Middleware
    yield* service.add((httpApp) =>
      Effect.mapInputContext(middleware(httpApp), (input) => Context.merge(context, input))
    )
  })

const middlewareAddNoContext = (
  middleware: HttpMiddleware.HttpMiddleware
): Effect.Effect<void, never, Middleware> =>
  Effect.gen(function*() {
    const service = yield* Middleware
    yield* service.add(middleware)
  })

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
  ): Layer.Layer<never, EX, Exclude<RX, Scope>>
  <R, EX = never, RX = never>(
    middleware: MiddlewareFn<never, R> | Effect.Effect<MiddlewareFn<never, R>, EX, RX>,
    options: {
      readonly withContext: true
    }
  ): Layer.Layer<never, EX, Exclude<HttpRouter.HttpRouter.ExcludeProvided<R> | RX, Scope>>
  <ApiId extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, EX = never, RX = never>(
    api: HttpApi.HttpApi<ApiId, Groups, Error, ErrorR>,
    middleware: MiddlewareFn<NoInfer<Error>> | Effect.Effect<MiddlewareFn<NoInfer<Error>>, EX, RX>,
    options?: {
      readonly withContext?: false | undefined
    }
  ): Layer.Layer<never, EX, Exclude<RX, Scope>>
  <ApiId extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, R, EX = never, RX = never>(
    api: HttpApi.HttpApi<ApiId, Groups, Error, ErrorR>,
    middleware: MiddlewareFn<NoInfer<Error>, R> | Effect.Effect<MiddlewareFn<NoInfer<Error>, R>, EX, RX>,
    options: {
      readonly withContext: true
    }
  ): Layer.Layer<never, EX, Exclude<HttpRouter.HttpRouter.ExcludeProvided<R> | RX, Scope>>
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
  return (Effect.isEffect(middleware)
    ? Layer.scopedDiscard(Effect.flatMap(middleware as any, add))
    : Layer.scopedDiscard(add(middleware as any))).pipe(Layer.provide(Middleware.layer))
}

/**
 * A CORS middleware layer that can be provided to the `HttpApiBuilder.serve` layer.
 *
 * @since 1.0.0
 * @category middleware
 */
export const middlewareCors = (
  options?: {
    readonly allowedOrigins?: ReadonlyArray<string> | Predicate.Predicate<string> | undefined
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
    readonly path?: HttpApiEndpoint.PathSegment | undefined
    readonly additionalPropertiesStrategy?: OpenApi.AdditionalPropertiesStrategy | undefined
  } | undefined
): Layer.Layer<never, never, HttpApi.Api> =>
  Router.use((router) =>
    Effect.gen(function*() {
      const { api } = yield* HttpApi.Api
      const spec = OpenApi.fromApi(api, {
        additionalPropertiesStrategy: options?.additionalPropertiesStrategy
      })
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
      const key = self.in === "header" ? self.key.toLowerCase() : self.key
      const schema = Schema.Struct({
        [key]: Schema.String
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
        onSuccess: (match) => Redacted.make(match[key])
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
 * ```ts skip-type-checking
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
