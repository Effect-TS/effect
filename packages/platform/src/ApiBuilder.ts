/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { identity } from "effect/Function"
import type * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type { ReadonlyRecord } from "effect/Record"
import type { Covariant, NoInfer } from "effect/Types"
import type * as Api from "./Api.js"
import * as ApiEndpoint from "./ApiEndpoint.js"
import { ApiDecodeError } from "./ApiError.js"
import type * as ApiGroup from "./ApiGroup.js"
import type * as HttpApp from "./HttpApp.js"
import * as HttpMethod from "./HttpMethod.js"
import * as HttpRouter from "./HttpRouter.js"
import * as HttpServerRequest from "./HttpServerRequest.js"
import * as HttpServerResponse from "./HttpServerResponse.js"

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
export const serve = <Name extends string, Groups extends ApiGroup.ApiGroup.Any, A, E, R>(
  self: Api.Api<Name, Groups>,
  f: (httpApp: HttpApp.Default<never, HttpRouter.HttpRouter.DefaultServices>) => Layer.Layer<A, E, R>
): Layer.Layer<
  A,
  E,
  R | ApiGroup.ApiGroup.ToService<Groups>
> =>
  ApiRouter.unwrap((router) => {
    const errorSchema = makeErrorSchema(self as any)
    const encodeError = Schema.encodeUnknown(errorSchema)
    return router.pipe(
      Effect.catchAll((error) =>
        Effect.matchEffect(encodeError(error), {
          onFailure: () => Effect.die(error),
          onSuccess: ([body, status]) => Effect.orDie(HttpServerResponse.json(body, { status }))
        })
      ),
      f
    )
  })

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
  Endpoints extends ApiEndpoint.ApiEndpoint.Any = never
> extends Pipeable {
  readonly [HandlersTypeId]: {
    _Endpoints: Covariant<Endpoints>
  }
  readonly group: ApiGroup.ApiGroup<any, ApiEndpoint.ApiEndpoint.Any, any, R>
  readonly handlers: Chunk.Chunk<[ApiEndpoint.ApiEndpoint.Any, ApiEndpoint.ApiEndpoint.Handler<any, E, R>]>
}

const HandlersProto = {
  [HandlersTypeId]: {
    _Endpoints: identity
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeHandlers = <Name extends string, Error, ErrorR, E, R, Endpoints extends ApiEndpoint.ApiEndpoint.Any>(
  options: {
    readonly group: ApiGroup.ApiGroup<Name, Endpoints, Error, ErrorR>
    readonly handlers: Chunk.Chunk<[ApiEndpoint.ApiEndpoint.Any, ApiEndpoint.ApiEndpoint.Handler<any, E, R>]>
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
  ApiName extends string,
  Groups extends ApiGroup.ApiGroup.Any,
  ApiError,
  ApiErrorR,
  const Name extends Groups["name"],
  RH,
  EX = never,
  RX = never
>(
  api: Api.Api<ApiName, Groups, ApiError, ApiErrorR>,
  groupName: Name,
  build: (
    handlers: Handlers<never, never, ApiGroup.ApiGroup.EndpointsWithName<Groups, Name>>
  ) =>
    | Handlers<NoInfer<ApiError> | ApiGroup.ApiGroup.ErrorWithName<Groups, Name>, RH>
    | Effect.Effect<Handlers<NoInfer<ApiError> | ApiGroup.ApiGroup.ErrorWithName<Groups, Name>, RH>, EX, RX>
): Layer.Layer<ApiGroup.ApiGroup.Service<Name>, EX, RX> =>
  ApiRouter.use((router) =>
    Effect.gen(function*() {
      const group = Chunk.findFirst(api.groups, (group) => group.name === groupName)
      if (group._tag === "None") {
        throw new Error(`Group "${groupName}" not found in API "${api.name}"`)
      }
      const result = build(makeHandlers({ group: group.value as any, handlers: Chunk.empty() }))
      const handlers = Effect.isEffect(result) ? (yield* result) : result
      yield* router.concat(
        HttpRouter.fromIterable(
          Chunk.map(handlers.handlers, ([endpoint, handler]) => handlerToRoute(endpoint, handler))
        )
      )
    })
  ) as Layer.Layer<ApiGroup.ApiGroup.Service<Name>, EX, RX>

/**
 * @since 1.0.0
 * @category handlers
 */
export const handle = <Endpoints extends ApiEndpoint.ApiEndpoint.Any, const Name extends Endpoints["name"], E, R>(
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
    handlers: Chunk.append(self.handlers, [endpoint, handler]) as any
  }) as any
}

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
  const encodeSuccess = Option.map(ApiEndpoint.successSchema(endpoint), Schema.encodeUnknown)
  const successStatus = ApiEndpoint.successStatus(endpoint)
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

const makeErrorSchema = (
  api: Api.Api<string, ApiGroup.ApiGroup<string, ApiEndpoint.ApiEndpoint.Any>, any, any>
): Schema.Schema<unknown, [error: unknown, status: number]> => {
  const schemas = new Set<Schema.Schema.Any>([ApiDecodeError])
  for (const group of api.groups) {
    for (const endpoint of group.endpoints) {
      schemas.add(endpoint.errorSchema)
    }
    const groupAst = group.error.ast
    if (groupAst._tag === "Union") {
      for (const ast of groupAst.types) {
        schemas.add(
          Schema.make(ast).annotations({
            ...groupAst.annotations,
            ...ast.annotations
          })
        )
      }
    } else {
      schemas.add(group.error)
    }
  }
  return Schema.Union(...[...schemas].map((schema) => {
    const annotations = schema.ast._tag === "Transformation" ?
      {
        ...schema.ast.to.annotations,
        ...schema.ast.annotations
      } :
      schema.ast.annotations
    const status = annotations[ApiEndpoint.AnnotationStatus] ?? 500
    return Schema.transform(Schema.Any, schema, {
      decode: identity,
      encode: (error) => [error, status]
    })
  })) as any
}
