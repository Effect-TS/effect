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
import type { Simplify } from "effect/Types"
import * as HttpApi from "./HttpApi.js"
import type { HttpApiEndpoint } from "./HttpApiEndpoint.js"
import type { HttpApiGroup } from "./HttpApiGroup.js"
import type * as HttpApiMiddleware from "./HttpApiMiddleware.js"
import * as HttpApiSchema from "./HttpApiSchema.js"
import * as HttpBody from "./HttpBody.js"
import * as HttpClient from "./HttpClient.js"
import * as HttpClientError from "./HttpClientError.js"
import * as HttpClientRequest from "./HttpClientRequest.js"
import * as HttpClientResponse from "./HttpClientResponse.js"
import * as HttpMethod from "./HttpMethod.js"
import * as UrlParams from "./UrlParams.js"

/**
 * @since 1.0.0
 * @category models
 */
export type Client<Groups extends HttpApiGroup.Any, E, R> = Simplify<
  & {
    readonly [Group in Extract<Groups, { readonly topLevel: false }> as HttpApiGroup.Name<Group>]: Client.Group<
      Group,
      Group["identifier"],
      E,
      R
    >
  }
  & {
    readonly [Method in Client.TopLevelMethods<Groups, E, R> as Method[0]]: Method[1]
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
  export type Group<Groups extends HttpApiGroup.Any, GroupName extends Groups["identifier"], E, R> =
    [HttpApiGroup.WithName<Groups, GroupName>] extends
      [HttpApiGroup<infer _GroupName, infer _Endpoints, infer _GroupError, infer _GroupErrorR>] ? {
        readonly [Endpoint in _Endpoints as HttpApiEndpoint.Name<Endpoint>]: Method<
          Endpoint,
          E,
          _GroupError,
          R
        >
      } :
      never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Method<Endpoint, E, GroupError, R> = [Endpoint] extends [
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
      _Error | GroupError | E | HttpClientError.HttpClientError | ParseResult.ParseError,
      R
    > :
    never

  /**
   * @since 1.0.0
   * @category models
   */
  export type TopLevelMethods<Groups extends HttpApiGroup.Any, E, R> =
    Extract<Groups, { readonly topLevel: true }> extends
      HttpApiGroup<infer _Id, infer _Endpoints, infer _Error, infer _ErrorR, infer _TopLevel> ?
      _Endpoints extends infer Endpoint ? [HttpApiEndpoint.Name<Endpoint>, Method<Endpoint, E, _Error, R>]
      : never :
      never
}

/**
 * @internal
 */
const makeClient = <ApiId extends string, Groups extends HttpApiGroup.Any, ApiError, ApiR, E, R>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
  options: {
    readonly httpClient: HttpClient.HttpClient.With<E, R>
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
    readonly transformResponse?:
      | ((effect: Effect.Effect<unknown, unknown>) => Effect.Effect<unknown, unknown>)
      | undefined
    readonly baseUrl?: URL | string | undefined
  }
): Effect.Effect<
  void,
  never,
  HttpApiMiddleware.HttpApiMiddleware.Without<ApiR | HttpApiGroup.ClientContext<Groups>>
> =>
  Effect.gen(function*() {
    const context = yield* Effect.context<any>()
    const httpClient = options.httpClient.pipe(
      options?.baseUrl === undefined
        ? identity
        : HttpClient.mapRequest(
          HttpClientRequest.prependUrl(options.baseUrl.toString())
        )
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
        const encodePath = endpoint.pathSchema.pipe(
          Option.map(Schema.encodeUnknown)
        )
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
        const endpointFn = Effect.fnUntraced(function*(request: {
          readonly path: any
          readonly urlParams: any
          readonly payload: any
          readonly headers: any
          readonly withResponse?: boolean
        }) {
          let httpRequest = HttpClientRequest.make(endpoint.method)(endpoint.path)
          if (request && request.path) {
            const encodedPathParams = encodePath._tag === "Some"
              ? yield* encodePath.value(request.path)
              : request.path
            httpRequest = HttpClientRequest.setUrl(httpRequest, makeUrl(encodedPathParams))
          }
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
        }, Effect.mapInputContext((input) => Context.merge(context, input)))

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
      | ((effect: Effect.Effect<unknown, unknown>) => Effect.Effect<unknown, unknown>)
      | undefined
    readonly baseUrl?: URL | string | undefined
  }
): Effect.Effect<
  Simplify<Client<Groups, ApiError, never>>,
  never,
  HttpApiMiddleware.HttpApiMiddleware.Without<ApiR | HttpApiGroup.ClientContext<Groups>> | HttpClient.HttpClient
> =>
  Effect.flatMap(HttpClient.HttpClient, (httpClient) =>
    makeWith(api, {
      ...options,
      httpClient: options?.transformClient ? options.transformClient(httpClient) : httpClient
    }))

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWith = <ApiId extends string, Groups extends HttpApiGroup.Any, ApiError, ApiR, E, R>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
  options: {
    readonly httpClient: HttpClient.HttpClient.With<E, R>
    readonly transformResponse?:
      | ((effect: Effect.Effect<unknown, unknown>) => Effect.Effect<unknown, unknown>)
      | undefined
    readonly baseUrl?: URL | string | undefined
  }
): Effect.Effect<
  Simplify<Client<Groups, ApiError | E, R>>,
  never,
  HttpApiMiddleware.HttpApiMiddleware.Without<ApiR | HttpApiGroup.ClientContext<Groups>>
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
  const GroupName extends HttpApiGroup.Name<Groups>,
  E,
  R
>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
  options: {
    readonly group: GroupName
    readonly httpClient: HttpClient.HttpClient.With<E, R>
    readonly transformResponse?:
      | ((effect: Effect.Effect<unknown, unknown>) => Effect.Effect<unknown, unknown>)
      | undefined
    readonly baseUrl?: URL | string | undefined
  }
): Effect.Effect<
  Client.Group<Groups, GroupName, ApiError | E, R>,
  never,
  HttpApiMiddleware.HttpApiMiddleware.Without<
    | ApiR
    | HttpApiGroup.ClientContext<
      HttpApiGroup.WithName<Groups, GroupName>
    >
  >
> => {
  const client: Record<string, any> = {}
  return makeClient(api, {
    ...options,
    predicate: ({ group }) => group.identifier === options.group,
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
  const EndpointName extends HttpApiEndpoint.Name<HttpApiGroup.EndpointsWithName<Groups, GroupName>>,
  E,
  R
>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
  options: {
    readonly group: GroupName
    readonly endpoint: EndpointName
    readonly httpClient: HttpClient.HttpClient.With<E, R>
    readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
    readonly transformResponse?:
      | ((effect: Effect.Effect<unknown, unknown>) => Effect.Effect<unknown, unknown>)
      | undefined
    readonly baseUrl?: URL | string | undefined
  }
): Effect.Effect<
  Client.Method<
    HttpApiEndpoint.WithName<HttpApiGroup.Endpoints<HttpApiGroup.WithName<Groups, GroupName>>, EndpointName>,
    HttpApiGroup.Error<HttpApiGroup.WithName<Groups, GroupName>>,
    ApiError | E,
    R
  >,
  never,
  HttpApiMiddleware.HttpApiMiddleware.Without<
    | ApiR
    | HttpApiGroup.Context<HttpApiGroup.WithName<Groups, GroupName>>
    | HttpApiEndpoint.ContextWithName<HttpApiGroup.EndpointsWithName<Groups, GroupName>, EndpointName>
    | HttpApiEndpoint.ErrorContextWithName<HttpApiGroup.EndpointsWithName<Groups, GroupName>, EndpointName>
  >
> => {
  let client: any = undefined
  return makeClient(api, {
    ...options,
    predicate: ({ endpoint, group }) => group.identifier === options.group && endpoint.name === options.endpoint,
    onEndpoint({ endpointFn }) {
      client = endpointFn
    }
  }).pipe(Effect.map(() => client)) as any
}

// ----------------------------------------------------------------------------

const paramsRegex = /:(\w+)\??/g

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
  const encoding = HttpApiSchema.getEncoding(ast)
  const decode = Schema.decode(schemaFromArrayBuffer(ast, encoding))
  return (response) => Effect.flatMap(response.arrayBuffer, decode)
}

const Uint8ArrayFromArrayBuffer = Schema.transform(
  Schema.Unknown as Schema.Schema<ArrayBuffer>,
  Schema.Uint8ArrayFromSelf,
  {
    decode(fromA) {
      return new Uint8Array(fromA)
    },
    encode(arr) {
      return arr.byteLength === arr.buffer.byteLength ?
        arr.buffer :
        arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)
    }
  }
)

const StringFromArrayBuffer = Schema.transform(
  Schema.Unknown as Schema.Schema<ArrayBuffer>,
  Schema.String,
  {
    decode(fromA) {
      return new TextDecoder().decode(fromA)
    },
    encode(toI) {
      const arr = new TextEncoder().encode(toI)
      return arr.byteLength === arr.buffer.byteLength ?
        arr.buffer :
        arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)
    }
  }
)

const parseJsonOrVoid = Schema.transformOrFail(
  Schema.String,
  Schema.Unknown,
  {
    strict: true,
    decode: (i, _, ast) => {
      if (i === "") return ParseResult.succeed(void 0)
      return ParseResult.try({
        try: () => JSON.parse(i),
        catch: () => new ParseResult.Type(ast, i, "Could not parse JSON")
      })
    },
    encode: (a, _, ast) => {
      if (a === undefined) return ParseResult.succeed("")
      return ParseResult.try({
        try: () => JSON.stringify(a),
        catch: () => new ParseResult.Type(ast, a, "Could not encode as JSON")
      })
    }
  }
)

const parseJsonArrayBuffer = Schema.compose(StringFromArrayBuffer, parseJsonOrVoid)

const schemaFromArrayBuffer = (
  ast: AST.AST,
  encoding: HttpApiSchema.Encoding
): Schema.Schema<any, ArrayBuffer> => {
  if (ast._tag === "Union") {
    return Schema.Union(...ast.types.map((ast) => schemaFromArrayBuffer(ast, HttpApiSchema.getEncoding(ast, encoding))))
  }
  const schema = Schema.make(ast)
  switch (encoding.kind) {
    case "Json": {
      return Schema.compose(parseJsonArrayBuffer, schema)
    }
    case "UrlParams": {
      return Schema.compose(StringFromArrayBuffer, UrlParams.schemaParse(schema as any)) as any
    }
    case "Uint8Array": {
      return Schema.compose(Uint8ArrayFromArrayBuffer, schema)
    }
    case "Text": {
      return Schema.compose(StringFromArrayBuffer, schema)
    }
  }
}

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
            try {
              return ParseResult.succeed(HttpBody.text(JSON.stringify(toI), encoding.contentType))
            } catch {
              return ParseResult.fail(new ParseResult.Type(ast, toI, "Could not encode as JSON"))
            }
          }
          case "Text": {
            if (typeof toI !== "string") {
              return ParseResult.fail(new ParseResult.Type(ast, toI, "Expected a string"))
            }
            return ParseResult.succeed(HttpBody.text(toI, encoding.contentType))
          }
          case "UrlParams": {
            return ParseResult.succeed(HttpBody.urlParams(UrlParams.fromInput(toI as any)))
          }
          case "Uint8Array": {
            if (!(toI instanceof Uint8Array)) {
              return ParseResult.fail(new ParseResult.Type(ast, toI, "Expected a Uint8Array"))
            }
            return ParseResult.succeed(HttpBody.uint8Array(toI, encoding.contentType))
          }
        }
      }
    }
  )
  bodyFromPayloadCache.set(ast, transform)
  return transform
}
