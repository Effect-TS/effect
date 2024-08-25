/**
 * @since 1.0.0
 */
import type * as AST from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as FiberRef from "effect/FiberRef"
import { identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type { ReadonlyRecord } from "effect/Record"
import * as Redacted from "effect/Redacted"
import type { Scope } from "effect/Scope"
import type { Covariant, Mutable, NoInfer } from "effect/Types"
import { unify } from "effect/Unify"
import * as Api from "./Api.js"
import * as ApiEndpoint from "./ApiEndpoint.js"
import { ApiDecodeError } from "./ApiError.js"
import type * as ApiGroup from "./ApiGroup.js"
import * as ApiSchema from "./ApiSchema.js"
import type * as ApiSecurity from "./ApiSecurity.js"
import type * as HttpApp from "./HttpApp.js"
import * as HttpMethod from "./HttpMethod.js"
import * as HttpMiddleware from "./HttpMiddleware.js"
import * as HttpRouter from "./HttpRouter.js"
import * as HttpServer from "./HttpServer.js"
import * as HttpServerRequest from "./HttpServerRequest.js"
import * as HttpServerResponse from "./HttpServerResponse.js"
import * as OpenApi from "./OpenApi.js"

/**
 * The router that the API endpoints are attached to.
 *
 * @since 1.0.0
 * @category router
 */
export class ApiRouter extends HttpRouter.Tag("@effect/platform/ApiBuilder/ApiRouter")<ApiRouter>() {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const serve: {
  (): Layer.Layer<never, never, HttpServer.HttpServer>
  <R>(
    middleware: (httpApp: HttpApp.Default) => HttpApp.Default<never, R>
  ): Layer.Layer<
    never,
    never,
    | HttpServer.HttpServer
    | Exclude<R, Scope | HttpServerRequest.HttpServerRequest>
  >
} = (middleware?: HttpMiddleware.HttpMiddleware.Applied<any, never, any>): Layer.Layer<
  never,
  never,
  any
> =>
  httpApp.pipe(
    Effect.map(HttpServer.serve(middleware!)),
    Layer.unwrapEffect,
    Layer.provide(ApiRouter.Live)
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const httpApp: Effect.Effect<
  HttpApp.Default,
  never,
  ApiRouter | Api.Api.Service
> = Effect.gen(function*() {
  const api = yield* Api.Api
  const router = yield* ApiRouter.router
  const apiMiddleware = yield* Effect.serviceOption(ApiMiddleware)
  const errorSchema = makeErrorSchema(api as any)
  const encodeError = Schema.encodeUnknown(errorSchema)
  return router.pipe(
    apiMiddleware._tag === "Some" ? apiMiddleware.value : identity,
    Effect.catchAll((error) =>
      Effect.matchEffect(encodeError(error), {
        onFailure: () => Effect.die(error),
        onSuccess: ([body, status]) => Effect.orDie(HttpServerResponse.json(body, { status }))
      })
    )
  )
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const api = <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR>(
  self: Api.Api<Groups, Error, ErrorR>
): Layer.Layer<Api.Api.Service, never, ApiGroup.ApiGroup.ToService<Groups> | ErrorR> =>
  Layer.succeed(Api.Api, self) as any

/**
 * @since 1.0.0
 * @category handlers
 */
export const HandlersTypeId: unique symbol = Symbol.for("@effect/platform/ApiBuilder/Handlers")

/**
 * @since 1.0.0
 * @category handlers
 */
export type HandlersTypeId = typeof HandlersTypeId

/**
 * Represents a handled, or partially handled, `ApiGroup`.
 *
 * @since 1.0.0
 * @category handlers
 */
export interface Handlers<
  E,
  R,
  Endpoints extends ApiEndpoint.ApiEndpoint.All = never
> extends Pipeable {
  readonly [HandlersTypeId]: {
    _Endpoints: Covariant<Endpoints>
  }
  readonly group: ApiGroup.ApiGroup<any, ApiEndpoint.ApiEndpoint.All, any, R>
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
    readonly endpoint: ApiEndpoint.ApiEndpoint.Any
    readonly handler: ApiEndpoint.ApiEndpoint.Handler<any, E, R>
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

const makeHandlers = <E, R, Endpoints extends ApiEndpoint.ApiEndpoint.All>(
  options: {
    readonly group: ApiGroup.ApiGroup<any, ApiEndpoint.ApiEndpoint.All, any, R>
    readonly handlers: Chunk.Chunk<Handlers.Item<E, R>>
  }
): Handlers<E, R, Endpoints> => {
  const self = Object.create(HandlersProto)
  self.group = options.group
  self.handlers = options.handlers
  return self
}

/**
 * @since 1.0.0
 * @category handlers
 */
export const group = <
  Groups extends ApiGroup.ApiGroup.Any,
  ApiError,
  ApiErrorR,
  const Name extends Groups["name"],
  RH,
  EX = never,
  RX = never
>(
  api: Api.Api<Groups, ApiError, ApiErrorR>,
  groupName: Name,
  build: (
    handlers: Handlers<never, never, ApiGroup.ApiGroup.EndpointsWithName<Groups, Name>>
  ) =>
    | Handlers<NoInfer<ApiError> | ApiGroup.ApiGroup.ErrorWithName<Groups, Name>, RH>
    | Effect.Effect<Handlers<NoInfer<ApiError> | ApiGroup.ApiGroup.ErrorWithName<Groups, Name>, RH>, EX, RX>
): Layer.Layer<
  ApiGroup.ApiGroup.Service<Name>,
  EX,
  RX | RH | ApiGroup.ApiGroup.ContextWithName<Groups, Name> | ApiErrorR
> =>
  ApiRouter.use((router) =>
    Effect.gen(function*() {
      const context = yield* Effect.context<any>()
      const group = Chunk.findFirst(api.groups, (group) => group.name === groupName)
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
            }
          ))
        }
      }
      yield* router.concat(HttpRouter.fromIterable(routes))
    })
  ) as any

/**
 * @since 1.0.0
 * @category handlers
 */
export const handle = <Endpoints extends ApiEndpoint.ApiEndpoint.All, const Name extends Endpoints["name"], E, R>(
  name: Name,
  handler: ApiEndpoint.ApiEndpoint.HandlerWithName<Endpoints, Name, E, R>
) =>
<EG, RG>(
  self: Handlers<EG, RG, Endpoints>
): Handlers<
  EG | Exclude<E, ApiEndpoint.ApiEndpoint.ErrorWithName<Endpoints, Name>> | ApiDecodeError,
  RG | ApiEndpoint.ApiEndpoint.ExcludeProvided<R>,
  ApiEndpoint.ApiEndpoint.ExcludeName<Endpoints, Name>
> => {
  const o = Chunk.findFirst(self.group.endpoints, (endpoint) => endpoint.name === name)
  if (o._tag === "None") {
    throw new Error(`Endpoint "${name}" not found in group "${self.group.name}"`)
  }
  const endpoint = o.value
  return makeHandlers({
    group: self.group,
    handlers: Chunk.append(self.handlers, {
      _tag: "Handler",
      endpoint,
      handler
    }) as any
  })
}

/**
 * Add `HttpMiddleware` to a `Handlers` group.
 *
 * Any errors are required to have a corresponding schema in the API.
 * You can add middleware errors to an `ApiGroup` using the `ApiGroup.addError`
 * api.
 *
 * @since 1.0.0
 * @category middleware
 */
export const middleware =
  <E, R, E1, R1>(middleware: Handlers.Middleware<E, R, E1, R1>) =>
  <Endpoints extends ApiEndpoint.ApiEndpoint.All>(
    self: Handlers<E, R, Endpoints>
  ): Handlers<E1, ApiEndpoint.ApiEndpoint.ExcludeProvided<R1>, Endpoints> =>
    makeHandlers<E1, ApiEndpoint.ApiEndpoint.ExcludeProvided<R1>, Endpoints>({
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
export class ApiMiddleware extends Context.Tag("@effect/platform/ApiBuilder/ApiMiddleware")<
  ApiMiddleware,
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
      const current = Context.getOption(context, ApiMiddleware)
      const withContext: HttpMiddleware.HttpMiddleware = (httpApp) =>
        Effect.mapInputContext(middleware(httpApp), (input) => Context.merge(context, input))
      return current._tag === "None" ? withContext : (httpApp) => withContext(current.value(httpApp))
    }
  )

const middlewareAddNoContext = (
  middleware: HttpMiddleware.HttpMiddleware
): Effect.Effect<HttpMiddleware.HttpMiddleware> =>
  Effect.map(
    Effect.serviceOption(ApiMiddleware),
    (current): HttpMiddleware.HttpMiddleware => {
      return current._tag === "None" ? middleware : (httpApp) => middleware(current.value(httpApp))
    }
  )

/**
 * Create an `Api` level middleware `Layer`.
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
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, EX = never, RX = never>(
    api: Api.Api<Groups, Error, ErrorR>,
    middleware: ApiMiddleware.Fn<NoInfer<Error>> | Effect.Effect<ApiMiddleware.Fn<NoInfer<Error>>, EX, RX>,
    options?: {
      readonly withContext?: false | undefined
    }
  ): Layer.Layer<never, EX, RX>
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, R, EX = never, RX = never>(
    api: Api.Api<Groups, Error, ErrorR>,
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
    api: Api.Api.Any,
    middleware: ApiMiddleware.Fn<any, any> | Effect.Effect<ApiMiddleware.Fn<any, any>, any, any>,
    options?: {
      readonly withContext?: boolean | undefined
    } | undefined
  ]
): any => {
  const apiFirst = Api.isApi(args[0])
  const withContext = apiFirst ? args[2]?.withContext === true : (args as any)[1]?.withContext === true
  const add = withContext ? middlewareAdd : middlewareAddNoContext
  const middleware = apiFirst ? args[1] : args[0]
  return Effect.isEffect(middleware)
    ? Layer.effect(ApiMiddleware, Effect.flatMap(middleware as any, add))
    : Layer.effect(ApiMiddleware, add(middleware as any))
}

/**
 * Create an `Api` level middleware `Layer`, that has a `Scope` provided to
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
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, EX, RX>(
    api: Api.Api<Groups, Error, ErrorR>,
    middleware: Effect.Effect<ApiMiddleware.Fn<NoInfer<Error>>, EX, RX>,
    options?: {
      readonly withContext?: false | undefined
    }
  ): Layer.Layer<never, EX, Exclude<RX, Scope>>
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, R, EX, RX>(
    api: Api.Api<Groups, Error, ErrorR>,
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
    api: Api.Api.Any,
    middleware: ApiMiddleware.Fn<any, any> | Effect.Effect<ApiMiddleware.Fn<any, any>, any, any>,
    options?: {
      readonly withContext?: boolean | undefined
    } | undefined
  ]
): any => {
  const apiFirst = Api.isApi(args[0])
  const withContext = apiFirst ? args[2]?.withContext === true : (args as any)[1]?.withContext === true
  const add = withContext ? middlewareAdd : middlewareAddNoContext
  const middleware = apiFirst ? args[1] : args[0]
  return Layer.scoped(ApiMiddleware, Effect.flatMap(middleware as any, add))
}

/**
 * A CORS middleware layer.
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
): Layer.Layer<never, never, Api.Api.Service> =>
  ApiRouter.use((router) =>
    Effect.gen(function*() {
      const api = yield* Api.Api
      const spec = OpenApi.fromApi(api)
      const response = yield* HttpServerResponse.json(spec).pipe(
        Effect.orDie
      )
      yield* router.get(options?.path ?? "/openapi.json", response)
    })
  )

/**
 * @since 1.0.0
 * @category middleware
 */
export interface SecurityMiddleware<I, EM = never, RM = never> {
  <Endpoints extends ApiEndpoint.ApiEndpoint.All, E, R>(
    self: Handlers<E, R, Endpoints>
  ): Handlers<E | EM, Exclude<R, I> | ApiEndpoint.ApiEndpoint.ExcludeProvided<RM>, Endpoints>
}

/**
 * @since 1.0.0
 * @category middleware
 */
export const securityDecode = <Security extends ApiSecurity.ApiSecurity>(
  self: Security
): Effect.Effect<
  ApiSecurity.ApiSecurity.Type<Security>,
  never,
  HttpServerRequest.HttpServerRequest | HttpServerRequest.ParsedSearchParams
> => {
  switch (self._tag) {
    case "Bearer": {
      const prefixLen = `${self.prefix} `.length
      return Effect.map(
        HttpServerRequest.HttpServerRequest,
        (request) => Redacted.make((request.headers.authorization ?? "").slice(prefixLen)) as any
      )
    }
    case "ApiKey": {
      const schema = Schema.Struct({
        [self.key]: Schema.String
      })
      const decode = unify(
        self.in === "query"
          ? HttpServerRequest.schemaSearchParams(schema)
          : HttpServerRequest.schemaHeaders(schema)
      )
      return Effect.match(decode, {
        onFailure: () => Redacted.make("") as any,
        onSuccess: (match) => Redacted.make(match[self.key])
      })
    }
    case "Basic": {
      const empty: ApiSecurity.ApiSecurity.Type<Security> = {
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
 * Make a middleware from an `ApiSecurity` instance, that can be used when
 * constructing a `Handlers` group.
 *
 * @since 1.0.0
 * @category middleware
 * @example
 * import { ApiBuilder, ApiSecurity } from "@effect/platform"
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
 * const security = ApiSecurity.bearer()
 *
 * const securityMiddleware = Effect.gen(function*() {
 *   const accounts = yield* Accounts
 *   return ApiBuilder.middlewareSecurity(
 *     security,
 *     CurrentUser,
 *     (token) => accounts.findUserByAccessToken(Redacted.value(token))
 *   )
 * })
 */
export const middlewareSecurity = <Security extends ApiSecurity.ApiSecurity, I, S, EM, RM>(
  self: Security,
  tag: Context.Tag<I, S>,
  f: (
    credentials: ApiSecurity.ApiSecurity.Type<Security>
  ) => Effect.Effect<S, EM, RM>
): SecurityMiddleware<I, EM, RM> =>
  middleware(Effect.provideServiceEffect(
    tag,
    Effect.flatMap(securityDecode(self), f)
  )) as SecurityMiddleware<I, EM, RM>

/**
 * Make a middleware from an `ApiSecurity` instance, that can be used when
 * constructing a `Handlers` group.
 *
 * This version does not supply any context to the handlers.
 *
 * @since 1.0.0
 * @category middleware
 */
export const middlewareSecurityVoid = <Security extends ApiSecurity.ApiSecurity, X, EM, RM>(
  self: Security,
  f: (
    credentials: ApiSecurity.ApiSecurity.Type<Security>
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
  urlParams: ReadonlyRecord<string, string | Array<string>>
) => HttpMethod.hasBody(request.method) ? request.json : Effect.succeed(urlParams)

const handlerToRoute = (
  endpoint: ApiEndpoint.ApiEndpoint.Any,
  handler: ApiEndpoint.ApiEndpoint.Handler<any, any, any>
): HttpRouter.Route<any, any> => {
  const decodePath = Option.map(endpoint.pathSchema, Schema.decodeUnknown)
  const decodePayload = Option.map(endpoint.payloadSchema, Schema.decodeUnknown)
  const encodeSuccess = Option.map(ApiEndpoint.schemaSuccess(endpoint), Schema.encodeUnknown)
  const successStatus = ApiSchema.getStatusSuccess(endpoint.successSchema)
  return HttpRouter.makeRoute(
    endpoint.method,
    endpoint.path,
    Effect.withFiberRuntime((fiber) => {
      const context = fiber.getFiberRef(FiberRef.currentContext)
      const request = Context.unsafeGet(context, HttpServerRequest.HttpServerRequest)
      const routeContext = Context.unsafeGet(context, HttpRouter.RouteContext)
      const urlParams = Context.unsafeGet(context, HttpServerRequest.ParsedSearchParams)
      return (decodePath._tag === "Some"
        ? Effect.catchAll(decodePath.value(routeContext.params), ApiDecodeError.refailParseError)
        : Effect.succeed(routeContext.params)).pipe(
          Effect.bindTo("pathParams"),
          decodePayload._tag === "Some"
            ? Effect.bind("payload", (_) =>
              requestPayload(request, urlParams).pipe(
                Effect.orDie,
                Effect.flatMap((raw) => Effect.catchAll(decodePayload.value(raw), ApiDecodeError.refailParseError))
              ))
            : identity,
          Effect.flatMap((input) => {
            const request: any = { path: input.pathParams }
            if ("payload" in input) {
              request.payload = input.payload
            }
            return handler(request)
          }),
          encodeSuccess._tag === "Some"
            ? Effect.flatMap((body) =>
              encodeSuccess.value(body).pipe(
                Effect.flatMap((json) => HttpServerResponse.json(json, { status: successStatus })),
                Effect.orDie
              )
            )
            : Effect.as(HttpServerResponse.empty({ status: successStatus }))
        )
    })
  )
}

const astCache = globalValue("@effect/platform/ApiBuilder", () => new WeakMap<AST.AST, Schema.Schema.Any>())

const makeErrorSchema = (
  api: Api.Api<ApiGroup.ApiGroup<string, ApiEndpoint.ApiEndpoint.Any>, any, any>
): Schema.Schema<unknown, [error: unknown, status: number]> => {
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
  for (const group of api.groups) {
    for (const endpoint of group.endpoints) {
      processSchema(endpoint.errorSchema)
    }
    processSchema(group.errorSchema)
  }
  return Schema.Union(...[...schemas].map((schema) => {
    const status = ApiSchema.getStatusError(schema)
    return Schema.transform(Schema.Any, schema, {
      decode: identity,
      encode: (error) => [error, status]
    })
  })) as any
}
