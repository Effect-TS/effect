/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import type * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import type { Scope } from "effect/Scope"
import type { Simplify } from "effect/Types"
import * as HttpApi from "./HttpApi.js"
import type { HttpApiEndpoint } from "./HttpApiEndpoint.js"
import type { HttpApiGroup } from "./HttpApiGroup.js"
import * as HttpApiSchema from "./HttpApiSchema.js"
import * as HttpBody from "./HttpBody.js"
import * as HttpClient from "./HttpClient.js"
import * as HttpClientError from "./HttpClientError.js"
import * as HttpClientRequest from "./HttpClientRequest.js"
import * as HttpClientResponse from "./HttpClientResponse.js"
import * as HttpMethod from "./HttpMethod.js"
import type { HttpApiMiddleware } from "./index.js"
import * as UrlParams from "./UrlParams.js"

/**
 * @since 1.0.0
 * @category models
 */
export type Client<Groups extends HttpApiGroup.Any, ApiError> = Simplify<
  & {
    readonly [Group in Extract<Groups, { readonly topLevel: false }> as HttpApiGroup.Name<Group>]: Client.Group<
      Group,
      Group["identifier"],
      ApiError
    >
  }
  & {
    readonly [Method in Client.TopLevelMethods<Groups, ApiError> as Method[0]]: Method[1]
  }
>

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Client {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Group<Groups extends HttpApiGroup.Any, GroupName extends Groups["identifier"], ApiError> =
    [HttpApiGroup.WithName<Groups, GroupName>] extends
      [HttpApiGroup<infer _GroupName, infer _Endpoints, infer _GroupError, infer _GroupErrorR>] ? {
        readonly [Endpoint in _Endpoints as HttpApiEndpoint.Name<Endpoint>]: Method<
          Endpoint,
          ApiError,
          _GroupError
        >
      } :
      never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Method<Endpoint, ApiError, GroupError> = [Endpoint] extends [
    HttpApiEndpoint<
      infer _Name,
      infer _Method,
      infer _Path,
      infer _UrlParams,
      infer _Payload,
      infer _Headers,
      infer _Success,
      infer _Error,
      infer _R,
      infer _RE
    >
  ] ? <WithResponse extends boolean = false>(
      request: Simplify<HttpApiEndpoint.ClientRequest<_Path, _UrlParams, _Payload, _Headers, WithResponse>>
    ) => Effect.Effect<
      WithResponse extends true ? [_Success, HttpClientResponse.HttpClientResponse] : _Success,
      _Error | GroupError | ApiError | HttpClientError.HttpClientError
    > :
    never

  /**
   * @since 1.0.0
   * @category models
   */
  export type TopLevelMethods<Groups extends HttpApiGroup.Any, ApiError> =
    Extract<Groups, { readonly topLevel: true }> extends
      HttpApiGroup<infer _Id, infer _Endpoints, infer _Error, infer _ErrorR, infer _TopLevel> ?
      _Endpoints extends infer Endpoint ? [HttpApiEndpoint.Name<Endpoint>, Method<Endpoint, ApiError, _Error>]
      : never :
      never
}

/**
 * @internal
 */
const makeClient = <ApiId extends string, Groups extends HttpApiGroup.Any, ApiError, ApiR>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
  options: {
    readonly predicate?: Predicate.Predicate<{
      readonly endpoint: HttpApiEndpoint.AnyWithProps
      readonly group: HttpApiGroup.AnyWithProps
    }>
    readonly onGroup?: (options: {
      readonly group: HttpApiGroup.AnyWithProps
      readonly mergedAnnotations: Context.Context<never>
    }) => void
    readonly onEndpoint: (options: {
      readonly group: HttpApiGroup.AnyWithProps
      readonly endpoint: HttpApiEndpoint<string, HttpMethod.HttpMethod>
      readonly mergedAnnotations: Context.Context<never>
      readonly middleware: ReadonlySet<HttpApiMiddleware.TagClassAny>
      readonly successes: ReadonlyMap<number, {
        readonly ast: Option.Option<AST.AST>
        readonly description: Option.Option<string>
      }>
      readonly errors: ReadonlyMap<number, {
        readonly ast: Option.Option<AST.AST>
        readonly description: Option.Option<string>
      }>
      readonly endpointFn: Function
    }) => void
    readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
    readonly transformResponse?:
      | ((effect: Effect.Effect<unknown, unknown, Scope>) => Effect.Effect<unknown, unknown, Scope>)
      | undefined
    readonly baseUrl?: string | undefined
  }
): Effect.Effect<
  void,
  never,
  HttpApiMiddleware.HttpApiMiddleware.Without<ApiR | HttpApiGroup.ClientContext<Groups>> | HttpClient.HttpClient
> =>
  Effect.gen(function*() {
    const context = yield* Effect.context<any>()
    const httpClient = (yield* HttpClient.HttpClient).pipe(
      options?.baseUrl === undefined ? identity : HttpClient.mapRequest(HttpClientRequest.prependUrl(options.baseUrl)),
      options?.transformClient === undefined ? identity : options.transformClient
    )
    HttpApi.reflect(api as any, {
      predicate: options?.predicate,
      onGroup(onGroupOptions) {
        options.onGroup?.(onGroupOptions)
      },
      onEndpoint(onEndpointOptions) {
        const { endpoint, errors, successes } = onEndpointOptions
        const makeUrl = compilePath(endpoint.path)
        const decodeMap: Record<
          number | "orElse",
          (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<any, any>
        > = { orElse: statusOrElse }
        const decodeResponse = HttpClientResponse.matchStatus(decodeMap)
        errors.forEach(({ ast }, status) => {
          if (ast._tag === "None") {
            decodeMap[status] = statusCodeError
            return
          }
          const decode = schemaToResponse(ast.value)
          decodeMap[status] = (response) => Effect.flatMap(decode(response), Effect.fail)
        })
        successes.forEach(({ ast }, status) => {
          decodeMap[status] = ast._tag === "None" ? responseAsVoid : schemaToResponse(ast.value)
        })
        const encodePayloadBody = endpoint.payloadSchema.pipe(
          Option.map((schema) => {
            if (HttpMethod.hasBody(endpoint.method)) {
              return Schema.encodeUnknown(payloadSchemaBody(schema as any))
            }
            return Schema.encodeUnknown(schema)
          })
        )
        const encodeHeaders = endpoint.headersSchema.pipe(
          Option.map(Schema.encodeUnknown)
        )
        const encodeUrlParams = endpoint.urlParamsSchema.pipe(
          Option.map(Schema.encodeUnknown)
        )
        const endpointFn = (request: {
          readonly path: any
          readonly urlParams: any
          readonly payload: any
          readonly headers: any
          readonly withResponse?: boolean
        }) =>
          Effect.gen(function*() {
            let httpRequest = HttpClientRequest.make(endpoint.method)(
              request && request.path ? makeUrl(request.path) : endpoint.path
            )
            if (request && request.payload instanceof FormData) {
              httpRequest = HttpClientRequest.bodyFormData(httpRequest, request.payload)
            } else if (encodePayloadBody._tag === "Some") {
              if (HttpMethod.hasBody(endpoint.method)) {
                const body = (yield* encodePayloadBody.value(request.payload)) as HttpBody.HttpBody
                httpRequest = HttpClientRequest.setBody(httpRequest, body)
              } else {
                const urlParams = (yield* encodePayloadBody.value(request.payload)) as Record<string, string>
                httpRequest = HttpClientRequest.setUrlParams(httpRequest, urlParams)
              }
            }
            if (encodeHeaders._tag === "Some") {
              httpRequest = HttpClientRequest.setHeaders(
                httpRequest,
                (yield* encodeHeaders.value(request.headers)) as any
              )
            }
            if (encodeUrlParams._tag === "Some") {
              httpRequest = HttpClientRequest.appendUrlParams(
                httpRequest,
                (yield* encodeUrlParams.value(request.urlParams)) as any
              )
            }
            const response = yield* httpClient.execute(httpRequest)
            const value = yield* (options.transformResponse === undefined
              ? decodeResponse(response)
              : options.transformResponse(decodeResponse(response)))
            return request?.withResponse === true ? [value, response] : value
          }).pipe(
            Effect.scoped,
            Effect.catchIf(ParseResult.isParseError, Effect.die),
            Effect.mapInputContext((input) => Context.merge(context, input))
          )

        options.onEndpoint({
          ...onEndpointOptions,
          endpointFn
        })
      }
    })
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <ApiId extends string, Groups extends HttpApiGroup.Any, ApiError, ApiR>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
  options?: {
    readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
    readonly transformResponse?:
      | ((effect: Effect.Effect<unknown, unknown, Scope>) => Effect.Effect<unknown, unknown, Scope>)
      | undefined
    readonly baseUrl?: string | undefined
  }
): Effect.Effect<
  Simplify<Client<Groups, ApiError>>,
  never,
  HttpApiMiddleware.HttpApiMiddleware.Without<ApiR | HttpApiGroup.ClientContext<Groups>> | HttpClient.HttpClient
> => {
  const client: Record<string, Record<string, any>> = {}
  return makeClient(api, {
    ...options,
    onGroup({ group }) {
      if (group.topLevel) return
      client[group.identifier] = {}
    },
    onEndpoint({ endpoint, endpointFn, group }) {
      ;(group.topLevel ? client : client[group.identifier])[endpoint.name] = endpointFn
    }
  }).pipe(Effect.map(() => client)) as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const group = <
  ApiId extends string,
  Groups extends HttpApiGroup.Any,
  ApiError,
  ApiR,
  const GroupName extends Groups["identifier"]
>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
  groupId: GroupName,
  options?: {
    readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
    readonly transformResponse?:
      | ((effect: Effect.Effect<unknown, unknown, Scope>) => Effect.Effect<unknown, unknown, Scope>)
      | undefined
    readonly baseUrl?: string | undefined
  }
): Effect.Effect<
  Client.Group<Groups, GroupName, ApiError>,
  never,
  HttpApiMiddleware.HttpApiMiddleware.Without<
    | ApiR
    | HttpApiGroup.ClientContext<
      HttpApiGroup.WithName<Groups, GroupName>
    >
  > | HttpClient.HttpClient
> => {
  const client: Record<string, any> = {}
  return makeClient(api, {
    ...options,
    predicate: ({ group }) => group.identifier === groupId,
    onEndpoint({ endpoint, endpointFn }) {
      client[endpoint.name] = endpointFn
    }
  }).pipe(Effect.map(() => client)) as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const endpoint = <
  ApiId extends string,
  Groups extends HttpApiGroup.Any,
  ApiError,
  ApiR,
  const GroupName extends HttpApiGroup.Name<Groups>,
  const EndpointName extends HttpApiEndpoint.Name<HttpApiGroup.EndpointsWithName<Groups, GroupName>>
>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
  groupName: GroupName,
  endpointName: EndpointName,
  options?: {
    readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
    readonly transformResponse?:
      | ((effect: Effect.Effect<unknown, unknown, Scope>) => Effect.Effect<unknown, unknown, Scope>)
      | undefined
    readonly baseUrl?: string | undefined
  }
): Effect.Effect<
  Client.Method<
    HttpApiEndpoint.WithName<HttpApiGroup.Endpoints<HttpApiGroup.WithName<Groups, GroupName>>, EndpointName>,
    HttpApiGroup.Error<HttpApiGroup.WithName<Groups, GroupName>>,
    ApiError
  >,
  never,
  | HttpApiMiddleware.HttpApiMiddleware.Without<
    | ApiR
    | HttpApiGroup.Context<HttpApiGroup.WithName<Groups, GroupName>>
    | HttpApiEndpoint.ContextWithName<HttpApiGroup.EndpointsWithName<Groups, GroupName>, EndpointName>
    | HttpApiEndpoint.ErrorContextWithName<HttpApiGroup.EndpointsWithName<Groups, GroupName>, EndpointName>
  >
  | HttpClient.HttpClient
> => {
  let client: any = undefined
  return makeClient(api, {
    ...options,
    predicate: ({ endpoint, group }) => group.identifier === groupName && endpoint.name === endpointName,
    onEndpoint({ endpointFn }) {
      client = endpointFn
    }
  }).pipe(Effect.map(() => client)) as any
}

// ----------------------------------------------------------------------------

const paramsRegex = /:([^/:.]+)/g

const compilePath = (path: string) => {
  const segments = path.split(paramsRegex)
  const len = segments.length
  if (len === 1) {
    return (_: any) => path
  }
  return (params: Record<string, string>) => {
    let url = segments[0]
    for (let i = 1; i < len; i++) {
      if (i % 2 === 0) {
        url += segments[i]
      } else {
        url += params[segments[i]]
      }
    }
    return url
  }
}

const schemaToResponse = (
  ast: AST.AST
): (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<any, any> => {
  const schema = Schema.make(ast)
  const encoding = HttpApiSchema.getEncoding(ast)
  const decode = Schema.decodeUnknown(schema)
  switch (encoding.kind) {
    case "Json": {
      return (response) => Effect.flatMap(responseJson(response), decode)
    }
    case "UrlParams": {
      return HttpClientResponse.schemaBodyUrlParams(schema as any)
    }
    case "Uint8Array": {
      return (response: HttpClientResponse.HttpClientResponse) =>
        response.arrayBuffer.pipe(
          Effect.map((buffer) => new Uint8Array(buffer)),
          Effect.flatMap(decode)
        )
    }
    case "Text": {
      return (response) => Effect.flatMap(response.text, decode)
    }
  }
}

const responseJson = (response: HttpClientResponse.HttpClientResponse) =>
  Effect.flatMap(response.text, (text) =>
    text === "" ? Effect.void : Effect.try({
      try: () => JSON.parse(text),
      catch: (cause) =>
        new HttpClientError.ResponseError({
          reason: "Decode",
          request: response.request,
          response,
          cause
        })
    }))

const statusOrElse = (response: HttpClientResponse.HttpClientResponse) =>
  Effect.fail(
    new HttpClientError.ResponseError({
      reason: "Decode",
      request: response.request,
      response
    })
  )

const statusCodeError = (response: HttpClientResponse.HttpClientResponse) =>
  Effect.fail(
    new HttpClientError.ResponseError({
      reason: "StatusCode",
      request: response.request,
      response
    })
  )

const responseAsVoid = (_response: HttpClientResponse.HttpClientResponse) => Effect.void

const HttpBodyFromSelf = Schema.declare(HttpBody.isHttpBody)

const payloadSchemaBody = (schema: Schema.Schema.All): Schema.Schema<any, HttpBody.HttpBody> => {
  const members = schema.ast._tag === "Union" ? schema.ast.types : [schema.ast]
  return Schema.Union(...members.map(bodyFromPayload)) as any
}

const bodyFromPayloadCache = globalValue(
  "@effect/platform/HttpApiClient/bodyFromPayloadCache",
  () => new WeakMap<AST.AST, Schema.Schema.Any>()
)

const bodyFromPayload = (ast: AST.AST) => {
  if (bodyFromPayloadCache.has(ast)) {
    return bodyFromPayloadCache.get(ast)!
  }
  const schema = Schema.make(ast)
  const encoding = HttpApiSchema.getEncoding(ast)
  const transform = Schema.transformOrFail(
    HttpBodyFromSelf,
    schema,
    {
      decode(fromA, _, ast) {
        return ParseResult.fail(new ParseResult.Forbidden(ast, fromA, "encode only schema"))
      },
      encode(toI, _, ast) {
        switch (encoding.kind) {
          case "Json": {
            return HttpBody.json(toI).pipe(
              ParseResult.mapError((error) => new ParseResult.Type(ast, toI, `Could not encode as JSON: ${error}`))
            )
          }
          case "Text": {
            if (typeof toI !== "string") {
              return ParseResult.fail(new ParseResult.Type(ast, toI, "Expected a string"))
            }
            return ParseResult.succeed(HttpBody.text(toI))
          }
          case "UrlParams": {
            return ParseResult.succeed(HttpBody.urlParams(UrlParams.fromInput(toI as any)))
          }
          case "Uint8Array": {
            if (!(toI instanceof Uint8Array)) {
              return ParseResult.fail(new ParseResult.Type(ast, toI, "Expected a Uint8Array"))
            }
            return ParseResult.succeed(HttpBody.uint8Array(toI))
          }
        }
      }
    }
  )
  bodyFromPayloadCache.set(ast, transform)
  return transform
}
