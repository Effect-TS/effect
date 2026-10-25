/**
 * Builds HTTP clients from `HttpApi` declarations.
 *
 * The client methods are derived from the groups and endpoints in an `HttpApi`
 * and run through an `HttpClient`. They use the same schema-driven contract as
 * the server: request parts are encoded from endpoint schemas, client
 * middleware is applied, the HTTP request is executed, and declared success or
 * error responses are decoded. This module also includes helpers for building a
 * client for only one group, one endpoint, or only the encoded URL.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Arr from "../Array.ts"
import * as ByteSize from "../ByteSize.ts"
import * as Cause from "../Cause.ts"
import type * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Ndjson from "../encoding/Ndjson.ts"
import * as Sse from "../encoding/Sse.ts"
import { identity } from "../Function.ts"
import type * as Headers from "../http/Headers.ts"
import * as HttpBody from "../http/HttpBody.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientError from "../http/HttpClientError.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import type * as HttpClientResponse from "../http/HttpClientResponse.ts"
import * as HttpMethod from "../http/HttpMethod.ts"
import * as internalUrlParams from "../http/internal/urlParams.ts"
import * as UrlParams from "../http/UrlParams.ts"
import * as InternalRecord from "../internal/record.ts"
import * as Predicate from "../Predicate.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import * as SchemaIssue from "../SchemaIssue.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"
import type * as Socket from "../socket/Socket.ts"
import * as Stream from "../Stream.ts"
import type { Simplify } from "../Types.ts"
import * as UndefinedOr from "../UndefinedOr.ts"
import * as HttpApi from "./HttpApi.ts"
import * as HttpApiEndpoint from "./HttpApiEndpoint.ts"
import type * as HttpApiGroup from "./HttpApiGroup.ts"
import type * as HttpApiMiddleware from "./HttpApiMiddleware.ts"
import * as HttpApiSchema from "./HttpApiSchema.ts"
import * as MediaType from "./internal/mediaType.ts"
import * as HttpApiPath from "./internal/path.ts"

/**
 * The type-safe client shape generated from HTTP API groups, with non-top-level
 * groups exposed as nested objects and top-level endpoints exposed as methods.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Client<
  Groups extends HttpApiGroup.Constraint,
  E = never,
  R = never,
  Mapping extends Client.Mapping = Client.Unmapped
> = Simplify<
  & {
    readonly [Group in Extract<Groups, { readonly topLevel: false }> as HttpApiGroup.Identifier<Group>]: Client.Group<
      Group,
      E,
      R,
      Mapping
    >
  }
  & Client.TopLevelMethods<Groups, E, R, Mapping>
>

/**
 * Derives the typed client interface for an `HttpApi`, preserving any additional
 * client error and service requirements supplied by the caller.
 *
 * @stability unstable
 * @category utility types
 * @since 4.0.0
 */
export type ForApi<
  Api extends HttpApi.Constraint,
  E = never,
  R = never,
  Mapping extends Client.Mapping = Client.Unmapped
> = Api extends HttpApi.HttpApi<infer _Id, infer Groups> ? Client<Groups, E, R, Mapping> :
  never

/**
 * Computes the decoded success value a client receives for an endpoint
 * success schema, including headers, streaming Server-Sent Events, and
 * streaming byte responses.
 *
 * **Details**
 *
 * When `Mapping` is `Client.Mapped<E>`, `E` replaces the error channel of
 * returned streams, matching a client built with `mapError`.
 *
 * @stability unstable
 * @category utility types
 * @since 4.0.0
 */
export type SuccessType<S, Mapping extends Client.Mapping = Client.Unmapped> = S extends HttpApiSchema.WithHeaders<
  infer _Inner,
  infer _Headers
> ? HttpApiSchema.withHeaders<SuccessType<_Inner, Mapping>, _Headers["Type"]>
  : S extends HttpApiSchema.StreamSse<
    infer _Events,
    infer _Error,
    infer _Value
  > ? Stream.Stream<
      _Value,
      ReplaceError<
        Mapping,
        _Error["Type"] | HttpClientError.HttpClientError | Schema.SchemaError | Sse.Retry | Sse.SseError
      >,
      never
    >
  : S extends HttpApiSchema.StreamUint8Array ?
    Stream.Stream<Uint8Array, ReplaceError<Mapping, HttpClientError.HttpClientError>, never>
  : S extends HttpApiSchema.StreamNdjson<infer _S> ?
    Stream.Stream<_S["Type"], ReplaceError<Mapping, HttpClientError.HttpClientError | Schema.SchemaError>, never>
  : S extends HttpApiSchema.Upgrade<infer _Headers> ? [_Headers] extends [never] ? Upgraded : Upgraded<_Headers["Type"]>
  : S extends Schema.Constraint ? S["Type"]
  : never

/**
 * The value a client method returns for an endpoint declared with
 * `HttpApiSchema.Upgrade`: the headers of the `101 Switching Protocols`
 * response and the upgraded connection.
 *
 * **Details**
 *
 * `headers` is decoded with the upgrade's `headers` schema when it declares
 * one. See `HttpClientResponse.upgrade` for how the connection behaves and
 * when it closes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface Upgraded<Headers = Headers.Headers> {
  readonly headers: Headers
  readonly socket: Socket.Socket
}

// `Client.Mapped<E>` is not a generic type even when `E` is, so this resolves
// for generic, `any` and `never` mapper results
type ReplaceError<Mapping extends Client.Mapping, E> = Mapping extends Client.Mapped<infer MappedE> ? MappedE : E

type StreamError<A> = A extends Stream.Stream<infer _A, infer _E, infer _R> ? _E
  : A extends HttpApiSchema.withHeaders<infer _Body, infer _Headers> ? StreamError<_Body>
  : never

type GroupsInfo<Groups extends HttpApiGroup.Constraint> = Groups extends any ? Client.Info<
    HttpApiGroup.Identifier<Groups>,
    HttpApiEndpoint.Identifier<HttpApiGroup.Endpoints<Groups>>
  >
  : never

type SuccessDecodingServices<S> = S extends HttpApiSchema.StreamSse<
  infer _Events,
  infer _Error,
  infer _Value
> ?
    | _Events["DecodingServices"]
    | _Error["DecodingServices"]
  : S extends HttpApiSchema.StreamUint8Array ? never
  : S extends HttpApiSchema.StreamNdjson<infer _S> ? _S["DecodingServices"]
  : S extends HttpApiSchema.Upgrade<infer _Headers> ? _Headers["DecodingServices"]
  : S extends Schema.Constraint ? S["DecodingServices"]
  : never

// An uninferred type parameter is instantiated with its constraint, so methods
// without a streaming payload must constrain `PayloadR` to `never`. `StreamNdjson<any>`
// also matches item schemas that are only a `Schema.Constraint` (`disableCodecs`)
type PayloadServicesConstraint<Payload> =
  [Extract<Payload, HttpApiSchema.StreamUint8Array | HttpApiSchema.StreamNdjson<any>>] extends [never] ? never : unknown

/**
 * Helper types used to describe generated HTTP API clients, including endpoint
 * methods, response modes, and grouped client shapes.
 *
 * @stability unstable
 * @since 4.0.0
 */
export declare namespace Client {
  /**
   * The response mode accepted by generated client methods, controlling whether a
   * call returns the decoded success value, the raw response, or both.
   *
   * @stability unstable
   * @category models
   * @since 4.0.0
   */
  export type ResponseMode = HttpApiEndpoint.ClientResponseMode

  /**
   * Computes the value returned by a client method for a success type and response
   * mode.
   *
   * @stability unstable
   * @category models
   * @since 4.0.0
   */
  export type Response<Success, Mode extends ResponseMode> = Mode extends "decoded-and-response"
    ? [Success, HttpClientResponse.HttpClientResponse]
    : Mode extends "response-only" ? HttpClientResponse.HttpClientResponse
    : Success

  /**
   * The default for the error mapping parameter of the client types, meaning
   * the client was built without `mapError` and keeps its endpoint-specific
   * errors.
   *
   * @stability unstable
   * @category models
   * @since 4.0.7
   */
  export interface Unmapped {
    readonly "~effect/http-api/HttpApiClient/Unmapped": "~effect/http-api/HttpApiClient/Unmapped"
  }

  /**
   * The error mapping parameter of a client built with `mapError`. `E` is the
   * mapper's result, which replaces the typed errors of every method and of
   * the streams they succeed with.
   *
   * @stability unstable
   * @category models
   * @since 4.0.7
   */
  export interface Mapped<E> {
    readonly "~effect/http-api/HttpApiClient/Mapped": "~effect/http-api/HttpApiClient/Mapped"
    readonly error: E
  }

  /**
   * Whether a client's errors were replaced by `mapError`.
   *
   * @stability unstable
   * @category models
   * @since 4.0.7
   */
  export type Mapping = Unmapped | Mapped<any>

  /**
   * Identifies the endpoint a client method was generated for. It is passed to
   * `mapError` and `transformResponse`.
   *
   * @stability unstable
   * @category models
   * @since 4.0.7
   */
  export interface Info<Group extends string = string, Endpoint extends string = string> {
    readonly group: Group
    readonly endpoint: Endpoint
  }

  /**
   * The typed failures a client method for an endpoint can produce, including
   * the errors of streams it returns. This is the input of `mapError` for
   * `HttpApiClient.endpoint`.
   *
   * **Details**
   *
   * `E` is the error of the `HttpClient` used by the client.
   *
   * @stability unstable
   * @category utility types
   * @since 4.0.7
   */
  export type MethodError<Endpoint extends HttpApiEndpoint.ConstraintRequest, E = never> = Endpoint extends any ?
      | HttpApiMiddleware.Error<Endpoint["~Middleware"]>
      | HttpApiMiddleware.ClientError<Endpoint["~Middleware"]>
      | E
      | HttpClientError.HttpClientError
      | Endpoint["~Error"]["Type"]
      | Schema.SchemaError
      | StreamError<SuccessType<Endpoint["~Success"]>>
    : never

  /**
   * The typed failures any client method for the given groups can produce,
   * including the errors of streams they return. This is the input of
   * `mapError` for `HttpApiClient.make`, `makeWith` and `group`.
   *
   * **Details**
   *
   * `E` is the error of the `HttpClient` used by the client.
   *
   * @stability unstable
   * @category utility types
   * @since 4.0.7
   */
  export type Error<Groups extends HttpApiGroup.Constraint, E = never> = MethodError<
    Extract<HttpApiGroup.Endpoints<Groups>, HttpApiEndpoint.ConstraintRequest>,
    E
  >

  type GroupByEndpoint<Group extends HttpApiGroup.Constraint, E, R, Mapping extends Client.Mapping> =
    Group["endpoints"] extends infer Endpoints extends Readonly<Record<string, HttpApiEndpoint.ConstraintRequest>> ? {
        readonly [Identifier in keyof Endpoints]: Method<Endpoints[Identifier], E, R, Mapping>
      }
      : {}

  /**
   * The client object for one API group, mapping each endpoint identifier in that
   * group to its typed client method.
   *
   * @stability unstable
   * @category models
   * @since 4.0.0
   */
  export type Group<Group extends HttpApiGroup.Constraint, E, R, Mapping extends Client.Mapping = Unmapped> =
    GroupByEndpoint<Group, E, R, Mapping>

  type MethodReturn<
    Endpoint extends HttpApiEndpoint.ConstraintRequest,
    E,
    R,
    Mapping extends Client.Mapping,
    Mode extends ResponseMode,
    PayloadR
  > = Effect.Effect<
    Response<SuccessType<Endpoint["~Success"], Mapping>, Mode>,
    ReplaceError<
      Mapping,
      | HttpApiMiddleware.Error<Endpoint["~Middleware"]>
      | HttpApiMiddleware.ClientError<Endpoint["~Middleware"]>
      | E
      | HttpClientError.HttpClientError
      | ([Mode] extends ["response-only"] ? never : Endpoint["~Error"]["Type"] | Schema.SchemaError)
    >,
    | R
    | PayloadR
    | Endpoint["~Params"]["EncodingServices"]
    | Endpoint["~Query"]["EncodingServices"]
    | Endpoint["~Payload"]["EncodingServices"]
    | Endpoint["~Headers"]["EncodingServices"]
    | ([Mode] extends ["response-only"] ? never
      :
        | SuccessDecodingServices<Endpoint["~Success"]>
        | Endpoint["~Error"]["DecodingServices"])
  >

  /**
   * The typed function generated for an endpoint, accepting the endpoint request
   * shape, including optional per-call SSE decoding options. The returned effect's success,
   * error, and service channels reflect the endpoint schemas, middleware, and
   * selected response mode.
   *
   * **Details**
   *
   * The services of a streaming `payload` are inferred and added to the
   * returned effect. When `Mapping` is `Client.Mapped<E>`, `E` replaces the
   * typed errors of the returned effect and of any stream it succeeds with.
   *
   * @stability unstable
   * @category models
   * @since 4.0.0
   */
  export type Method<
    Endpoint extends HttpApiEndpoint.ConstraintRequest,
    E,
    R,
    Mapping extends Client.Mapping = Unmapped
  > = <
    Mode extends ResponseMode = "decoded-only",
    PayloadR extends PayloadServicesConstraint<Endpoint["~Payload"]> = never
  >(
    request: Simplify<
      HttpApiEndpoint.ClientRequest<
        Endpoint["~Params"],
        Endpoint["~Query"],
        Endpoint["~Payload"],
        Endpoint["~Headers"],
        Mode,
        PayloadR
      >
    >
  ) => MethodReturn<Endpoint, E, R, Mapping, Mode, NoInfer<PayloadR>>

  /**
   * Extracts client methods for endpoints in top-level groups so they can be exposed
   * directly on the generated client object.
   *
   * @stability unstable
   * @category models
   * @since 4.0.0
   */
  export type TopLevelMethods<Groups extends HttpApiGroup.Constraint, E, R, Mapping extends Client.Mapping = Unmapped> =
    {
      readonly [
        Endpoint in Extract<
          HttpApiGroup.Endpoints<Extract<Groups, { readonly topLevel: true }>>,
          HttpApiEndpoint.ConstraintRequest
        > as Endpoint["identifier"]
      ]: Method<Endpoint, E, R, Mapping>
    }
}

type UrlBuilderRequestPart<Key extends string, Value> = [Value] extends [never] ? {}
  : { readonly [K in Key]: Value }

type UrlBuilderRequest<
  Endpoint extends HttpApiEndpoint.Constraint,
  Params = HttpApiEndpoint.Params<Endpoint>["Type"],
  Query = HttpApiEndpoint.Query<Endpoint>["Type"]
> = (
  & UrlBuilderRequestPart<"params", Params>
  & UrlBuilderRequestPart<"query", Query>
) extends infer Request ? keyof Request extends never ? void | undefined : Request
  : never

type UrlBuilderArgs<Request> = [Request] extends [void | undefined] ? [request?: Request]
  : [request: Request]

/**
 * The type-safe URL builder shape for an HTTP API, mirroring the generated client
 * layout while returning URL strings instead of executing requests.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type UrlBuilder<Api extends HttpApi.Constraint> = Api extends HttpApi.HttpApi<infer _ApiId, infer Groups> ?
  [Extract<Groups, { readonly topLevel: true }>] extends [never] ? UrlBuilderGroups<Groups>
  : [Extract<Groups, { readonly topLevel: false }>] extends [never] ? UrlBuilderTopLevelMethods<Groups>
  : Simplify<UrlBuilderGroups<Groups> & UrlBuilderTopLevelMethods<Groups>>
  : never

type UrlBuilderGroups<Groups extends HttpApiGroup.Constraint> = {
  readonly [Group in Extract<Groups, { readonly topLevel: false }> as HttpApiGroup.Identifier<Group>]: UrlBuilderGroup<
    HttpApiGroup.Endpoints<Group>
  >
}

type UrlBuilderGroup<Endpoints extends HttpApiEndpoint.Constraint> = {
  readonly [Endpoint in Endpoints as HttpApiEndpoint.Identifier<Endpoint>]: UrlBuilderMethod<Endpoint>
}

type UrlBuilderMethod<Endpoint extends HttpApiEndpoint.Constraint> = (
  ...args: UrlBuilderArgs<UrlBuilderRequest<Endpoint>>
) => string

type UrlBuilderTopLevelMethods<Groups extends HttpApiGroup.Constraint> = {
  readonly [
    Endpoint in HttpApiGroup.Endpoints<Extract<Groups, { readonly topLevel: true }>> as HttpApiEndpoint.Identifier<
      Endpoint
    >
  ]: UrlBuilderMethod<Endpoint>
}

type MakeClientOptions<E, R> = {
  readonly httpClient: HttpClient.HttpClient.With<E, R>
  readonly mapError?: ((error: unknown, info: Client.Info) => unknown) | undefined
  readonly transformResponse?:
    | ((
      effect: Effect.Effect<unknown, unknown, unknown>,
      info: Client.Info
    ) => Effect.Effect<unknown, unknown, unknown>)
    | undefined
  readonly baseUrl?: URL | string | undefined
}

/**
 * @internal
 */
export const makeClient = <ApiId extends string, Groups extends HttpApiGroup.Constraint, E, R>(
  api: HttpApi.HttpApi<ApiId, Groups>,
  options: MakeClientOptions<E, R> & {
    readonly predicate?: Predicate.Predicate<{
      readonly endpoint: HttpApiEndpoint.Top
      readonly group: HttpApiGroup.Top
    }>
    readonly onGroup?: (options: {
      readonly group: HttpApiGroup.Top
      readonly mergedAnnotations: Context.Context<never>
    }) => void
    readonly onEndpoint: (options: {
      readonly group: HttpApiGroup.Top
      readonly endpoint: HttpApiEndpoint.Top
      readonly mergedAnnotations: Context.Context<never>
      readonly middleware: ReadonlySet<HttpApiMiddleware.AnyService>
      readonly successes: ReadonlyMap<number, readonly [Schema.Top, ...Array<Schema.Top>]>
      readonly errors: ReadonlyMap<number, readonly [Schema.Top, ...Array<Schema.Top>]>
      readonly endpointFn: Function
    }) => void
  }
): Effect.Effect<void> =>
  Effect.gen(function*() {
    const services = yield* Effect.context()

    const httpClient = options.httpClient.pipe(
      options?.baseUrl === undefined
        ? identity
        : HttpClient.mapRequest(
          HttpClientRequest.prependUrl(options.baseUrl.toString())
        )
    )

    function executeMiddleware(
      group: HttpApiGroup.Top,
      endpoint: HttpApiEndpoint.Top,
      request: HttpClientRequest.HttpClientRequest,
      middlewareKeys: ReadonlyArray<string>,
      index: number
    ): Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError> {
      if (index === -1) {
        return httpClient.execute(request) as unknown as Effect.Effect<
          HttpClientResponse.HttpClientResponse,
          HttpClientError.HttpClientError
        >
      }
      const middleware = services.mapUnsafe.get(middlewareKeys[index]) as
        | HttpApiMiddleware.HttpApiMiddlewareClient<any, any, any>
        | undefined
      if (middleware === undefined) {
        return executeMiddleware(group, endpoint, request, middlewareKeys, index - 1)
      }
      return middleware({
        endpoint,
        group,
        request,
        next(request) {
          return executeMiddleware(group, endpoint, request, middlewareKeys, index - 1)
        }
      }) as Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError>
    }

    HttpApi.reflect(api, {
      predicate: options?.predicate,
      onGroup(onGroupOptions) {
        options.onGroup?.(onGroupOptions)
      },
      onEndpoint(onEndpointOptions) {
        const { group, endpoint, errors, successes, mergedAnnotations } = onEndpointOptions
        const parseOptions = HttpApi.getSlotParseOptions(mergedAnnotations)
        const makeUrl = compilePath(endpoint.path, endpoint.params)
        const decodeMap: Record<number | "orElse", ResponseDecoder> = { orElse: statusOrElse }
        const errorAlternatives = new Map<number, Array<ResponseAlternative>>()
        for (const [status, schemas] of errors.entries()) {
          const grouped = groupSchemasByContentType(schemas)
          for (const [contentType, schemas] of grouped.entries()) {
            addResponseAlternative(
              errorAlternatives,
              status,
              contentType,
              schemasToResponse(schemas, parseOptions.error, parseOptions.headers)
            )
          }
        }
        for (const [status, alternatives] of errorAlternatives.entries()) {
          const decode = makeResponseDecoder(alternatives)
          decodeMap[status] = (response) =>
            Effect.flatMap(
              Effect.catchCause(decode(response), (cause) =>
                Effect.failCause(Cause.combine(
                  Cause.fail(
                    new HttpClientError.HttpClientError({
                      reason: new HttpClientError.StatusCodeError({
                        request: response.request,
                        response
                      })
                    })
                  ),
                  cause
                ))),
              Effect.fail
            )
        }

        const successAlternatives = new Map<number, Array<ResponseAlternative>>()
        for (const [status, schemas] of successes.entries()) {
          const grouped = groupSchemasByContentType(schemas)
          for (const [contentType, schemas] of grouped.entries()) {
            addResponseAlternative(
              successAlternatives,
              status,
              contentType,
              schemasToResponse(schemas, parseOptions.success, parseOptions.headers)
            )
          }
        }
        for (const streamSuccess of getStreamSuccessSchemas(endpoint)) {
          const streamSchema = isWithHeadersStreamSuccess(streamSuccess) ? streamSuccess.schema : streamSuccess
          addResponseAlternative(
            successAlternatives,
            HttpApiSchema.getStatusSuccessSchema(streamSuccess),
            streamSchema.contentType,
            streamToResponse(streamSuccess, parseOptions.success, parseOptions.headers)
          )
        }
        for (const [status, alternatives] of successAlternatives.entries()) {
          decodeMap[status] = makeResponseDecoder(alternatives)
        }
        const upgrade = getUpgradeSuccessSchema(endpoint)
        if (upgrade !== undefined) {
          const decodeHeaders = upgrade.headers === undefined
            ? Effect.succeed
            : Schema.decodeUnknownEffect(upgrade.headers, parseOptions.headers)
          decodeMap[101] = (response) =>
            Effect.zipWith(
              decodeHeaders(response.headers),
              response.upgrade,
              (headers, socket): Upgraded<unknown> => ({ headers, socket })
            )
        }

        const encodeParams = UndefinedOr.map(
          endpoint.params,
          (schema) => Schema.encodeUnknownEffect(schema, parseOptions.params)
        )

        const payloadSchemas: Array<Schema.Top> = []
        let streamPayload: StreamPayloadSchema | undefined
        for (const schema of HttpApiEndpoint.getPayloadSchemas(endpoint)) {
          if (HttpApiSchema.isStreamUint8Array(schema) || HttpApiSchema.isStreamNdjson(schema)) {
            streamPayload = schema
          } else {
            payloadSchemas.push(schema)
          }
        }
        const streamPayloadEncoder = UndefinedOr.map(streamPayload, (schema) => ({
          contentType: schema.contentType,
          encode: makeStreamPayloadEncoder(schema, parseOptions.payload)
        }))
        const encodePayload = Arr.isArrayNonEmpty(payloadSchemas) ?
          Schema.encodeUnknownEffect(
            HttpMethod.hasBody(endpoint.method)
              ? getEncodePayloadSchema(payloadSchemas, endpoint.method)
              : Schema.Union(payloadSchemas),
            parseOptions.payload
          ) :
          undefined

        const encodeHeaders = UndefinedOr.map(
          endpoint.headers,
          (schema) => Schema.encodeUnknownEffect(schema, parseOptions.headers)
        )
        const encodeQuery = UndefinedOr.map(
          endpoint.query,
          (schema) => Schema.encodeUnknownEffect(schema, parseOptions.query)
        )

        const middlewareKeys = Array.from(onEndpointOptions.middleware, (tag) => `${tag.key}/Client`)

        const info: Client.Info = { group: group.identifier, endpoint: endpoint.identifier }
        const mapError = options.mapError === undefined
          ? undefined
          : (error: unknown) => options.mapError!(error, info)

        const execute = Effect.fnUntraced(function*(
          request: {
            readonly params: Record<string, string> | undefined
            readonly query: unknown
            readonly payload: unknown
            readonly headers: Record<string, string> | undefined
            readonly responseMode?: HttpApiEndpoint.ClientResponseMode
            readonly sseOptions?: Sse.DecodeOptions | undefined
          } | undefined
        ) {
          let httpRequest = HttpClientRequest.make(endpoint.method)(endpoint.path)

          if (request !== undefined) {
            // params
            if (encodeParams !== undefined) {
              const params = (yield* encodeParams(request.params)) as Record<string, string>
              httpRequest = HttpClientRequest.setUrl(httpRequest, makeUrl(params))
            }

            // payload
            if (streamPayloadEncoder !== undefined && Stream.isStream(request.payload)) {
              const context = yield* Effect.context<never>()
              httpRequest = HttpClientRequest.setBody(
                httpRequest,
                HttpBody.stream(
                  Stream.provideContext(
                    streamPayloadEncoder.encode(request.payload),
                    context as Context.Context<unknown>
                  ),
                  streamPayloadEncoder.contentType
                )
              )
            } else if (encodePayload !== undefined) {
              if (HttpMethod.hasBody(endpoint.method)) {
                if (request.payload instanceof FormData) {
                  httpRequest = HttpClientRequest.bodyFormData(httpRequest, request.payload)
                } else {
                  const body = (yield* encodePayload(request.payload)) as HttpBody.HttpBody
                  httpRequest = HttpClientRequest.setBody(httpRequest, body)
                }
              } else {
                const urlParams = (yield* encodePayload(request.payload)) as Record<string, string>
                httpRequest = HttpClientRequest.appendUrlParams(httpRequest, urlParams)
              }
            } else if (streamPayloadEncoder !== undefined) {
              return yield* new Schema.SchemaError(
                new SchemaIssue.InvalidValue({ message: "Expected a Stream payload" }, request.payload)
              )
            }

            // headers
            if (encodeHeaders !== undefined) {
              const headers = (yield* encodeHeaders(request.headers)) as Record<string, string>
              httpRequest = HttpClientRequest.setHeaders(httpRequest, headers)
            }

            // query
            if (encodeQuery !== undefined) {
              const query = (yield* encodeQuery(request.query)) as Record<string, string>
              httpRequest = HttpClientRequest.appendUrlParams(httpRequest, query)
            }
          }

          if (upgrade !== undefined) {
            httpRequest = HttpClientRequest.upgrade(httpRequest, upgrade.protocol)
          }

          const response = yield* executeMiddleware(
            group,
            endpoint,
            httpRequest,
            middlewareKeys,
            middlewareKeys.length - 1
          )

          if (request?.responseMode === "response-only") {
            return response
          }

          const decoded = (decodeMap[response.status] ?? decodeMap.orElse)(response, request?.sseOptions)
          const transformed = yield* (options.transformResponse === undefined
            ? decoded
            : options.transformResponse(decoded, info))
          const value = mapError === undefined ? transformed : mapStreamError(transformed, mapError)

          return request?.responseMode === "decoded-and-response" ? [value, response] : value
        })
        const endpointFn = mapError === undefined
          ? execute
          : (request: Parameters<typeof execute>[0]) => Effect.mapError(execute(request), mapError)

        options.onEndpoint({
          ...onEndpointOptions,
          endpointFn
        })
      }
    })
  })

type MapperFn<Error, Info> = (error: Error, info: Info) => unknown

// Types a `mapError` callback's parameters while the mapper is still being
// inferred. `NoInfer` keeps it from being fixed to its `undefined` default
// first. Callbacks that return a value don't match it, so one passed with
// explicit type arguments that leave the mapper undefined is rejected
type ContextualMapper<Error, Info> = (error: Error, info: Info) => never

type MapErrorOption<Mapper, Error, Info> = {
  readonly mapError?: Mapper | NoInfer<ContextualMapper<Error, Info>>
}

// Inferred from the options argument, keeping optional modifiers, without
// taking part in typing the `mapError` callback. `Options` comes before
// `Mapper`, so explicit type arguments can't select a mapper without also
// describing the options
type InferredOptions<Options> = { readonly [K in keyof Options]: Options[K] }

// Only an options type that requires `mapError` gives a mapped client. A
// mapper that may be `undefined` (`MappingOf` distributes over `Mapper`), an
// optional `mapError` property, or explicit type arguments that name a mapper
// the options don't require keep the original errors next to the mapped one
type MappingOf<Options, Mapper> = Mapper extends (...args: ReadonlyArray<any>) => infer E ?
  Options extends { readonly mapError: unknown } ? Client.Mapped<E> : Client.Unmapped | Client.Mapped<E>
  : Client.Unmapped

type MakeOptions<Groups extends HttpApiGroup.Constraint, MapError> =
  & TransformResponseOptions<GroupsInfo<Groups>>
  & {
    readonly mapError?: MapError | undefined
    readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
  }

// The options argument of `make` is optional, so its mapping is read from the
// whole argument list: no argument, or one that may be `undefined`, keeps the
// original errors
type MakeMapping<Args> = Args extends readonly [] ? Client.Unmapped
  : Args extends readonly [infer Options] ? undefined extends Options ? Client.Unmapped | OptionsMapping<Options>
    : OptionsMapping<Options>
  : Args extends readonly [(infer Options)?] ? Client.Unmapped | OptionsMapping<Options>
  : Client.Unmapped

type OptionsMapping<Options> = Options extends { readonly mapError?: infer Mapper } ? MappingOf<Options, Mapper>
  : Client.Unmapped

type TransformResponseOptions<Info> = {
  readonly transformResponse?:
    | ((effect: Effect.Effect<unknown, unknown, unknown>, info: Info) => Effect.Effect<unknown, unknown, unknown>)
    | undefined
  readonly baseUrl?: URL | string | undefined
}

/**
 * Constructs a type-safe client for an HTTP API using the `HttpClient` service,
 * endpoint schemas, middleware, and optional client or response transformations.
 *
 * **Details**
 *
 * `mapError` replaces the typed failures of every method, and of the streams
 * they succeed with, with the mapper's result. It receives the failure and the
 * group and endpoint identifiers. Defects and interruptions are not mapped,
 * and neither are failures of an upgraded socket or of reading a response
 * returned with `responseMode: "response-only"`. When `mapError` may be
 * missing or `undefined`, such as an optional property spread into the
 * options or an options argument that may be `undefined`, the client keeps
 * the original failures in its types next to the mapper's result.
 *
 * `transformResponse` wraps the decoding of each response and receives the
 * same identifiers. It runs inside `mapError`, so its failures are mapped too.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = <
  ApiId extends string,
  Groups extends HttpApiGroup.Constraint,
  Args extends readonly [
    options?: MakeOptions<Groups, MapperFn<Client.Error<Groups>, GroupsInfo<Groups>>> | undefined
  ] = readonly [
    options?: MakeOptions<Groups, NoInfer<ContextualMapper<Client.Error<Groups>, GroupsInfo<Groups>>>> | undefined
  ]
>(
  api: HttpApi.HttpApi<ApiId, Groups>,
  ...options: Args
): Effect.Effect<
  Client<Groups, never, never, MakeMapping<Args>>,
  never,
  HttpClient.HttpClient | HttpApiGroup.MiddlewareClient<Groups>
> =>
  Effect.flatMap(HttpClient.HttpClient, (httpClient) =>
    makeWith(api, {
      ...options[0] as Omit<MakeClientOptions<never, never>, "httpClient">,
      httpClient: options[0]?.transformClient ? options[0].transformClient(httpClient) : httpClient
    })) as any

/**
 * Constructs a type-safe client for an HTTP API from the supplied `HttpClient`,
 * using the API metadata to encode requests, execute middleware, and decode
 * responses.
 *
 * **Details**
 *
 * `mapError` and `transformResponse` behave as described for `make`. The
 * failures passed to `mapError` include the `HttpClient` error.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeWith = <
  ApiId extends string,
  Groups extends HttpApiGroup.Constraint,
  E,
  R,
  Options = {},
  Mapper extends MapperFn<Client.Error<Groups, NoInfer<E>>, GroupsInfo<Groups>> | undefined = undefined
>(
  api: HttpApi.HttpApi<ApiId, Groups>,
  options:
    & TransformResponseOptions<GroupsInfo<Groups>>
    & MapErrorOption<Mapper, Client.Error<Groups, NoInfer<E>>, GroupsInfo<Groups>>
    & { readonly httpClient: HttpClient.HttpClient.With<E, R> }
    & InferredOptions<Options>
): Effect.Effect<
  Client<Groups, Exclude<E, HttpClientError.HttpClientError>, R, MappingOf<Options, Mapper>>,
  never,
  HttpApiGroup.MiddlewareClient<Groups>
> => {
  const client: Record<string, Record<string, any>> = {}
  return makeClient(api, {
    ...options as MakeClientOptions<E, R>,
    onGroup({ group }) {
      if (group.topLevel) return
      InternalRecord.assignProperty(client, group.identifier, {})
    },
    onEndpoint({ endpoint, endpointFn, group }) {
      InternalRecord.assignProperty(
        group.topLevel ? client : client[group.identifier],
        endpoint.identifier,
        endpointFn
      )
    }
  }).pipe(Effect.as(client)) as any
}

/**
 * Builds a typed client object for a single API group from the supplied
 * `HttpClient`, filtering the API to that group.
 *
 * **Details**
 *
 * `mapError` and `transformResponse` behave as described for `make`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const group = <
  ApiId extends string,
  Groups extends HttpApiGroup.Constraint,
  const GroupIdentifier extends HttpApiGroup.Identifier<Groups>,
  E,
  R,
  Options = {},
  Mapper extends
    | MapperFn<
      Client.Error<HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>, NoInfer<E>>,
      GroupsInfo<HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>>
    >
    | undefined = undefined
>(
  api: HttpApi.HttpApi<ApiId, Groups>,
  options:
    & TransformResponseOptions<GroupsInfo<HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>>>
    & MapErrorOption<
      Mapper,
      Client.Error<HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>, NoInfer<E>>,
      GroupsInfo<HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>>
    >
    & {
      readonly group: GroupIdentifier
      readonly httpClient: HttpClient.HttpClient.With<E, R>
    }
    & InferredOptions<Options>
): Effect.Effect<
  Client.Group<HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>, E, R, MappingOf<Options, Mapper>>,
  never,
  HttpApiGroup.MiddlewareClient<HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>>
> => {
  const client: Record<string, any> = {}
  return makeClient(api, {
    ...options as MakeClientOptions<E, R>,
    predicate: ({ group }) => group.identifier === options.group,
    onEndpoint({ endpoint, endpointFn }) {
      InternalRecord.assignProperty(client, endpoint.identifier, endpointFn)
    }
  }).pipe(Effect.map(() => client)) as any
}

type EndpointWithIdentifier<
  Groups extends HttpApiGroup.Constraint,
  GroupIdentifier extends HttpApiGroup.Identifier<Groups>,
  EndpointIdentifier extends HttpApiGroup.EndpointsWithIdentifier<Groups, GroupIdentifier>["identifier"]
> = Extract<
  HttpApiEndpoint.WithIdentifier<HttpApiGroup.EndpointsWithIdentifier<Groups, GroupIdentifier>, EndpointIdentifier>,
  HttpApiEndpoint.ConstraintRequest
>

type EndpointReturn<
  Endpoint extends HttpApiEndpoint.ConstraintRequest,
  E,
  R,
  Mapping extends Client.Mapping
> = Effect.Effect<Client.Method<Endpoint, E, R, Mapping>, never, HttpApiEndpoint.MiddlewareClient<Endpoint>>

/**
 * Builds the typed client method for one endpoint in one API group, using the
 * supplied `HttpClient` and endpoint metadata.
 *
 * **Details**
 *
 * `mapError` and `transformResponse` behave as described for `make`. The
 * failures passed to `mapError` are only those of this endpoint.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const endpoint = <
  ApiId extends string,
  Groups extends HttpApiGroup.Constraint,
  const GroupIdentifier extends HttpApiGroup.Identifier<Groups>,
  const EndpointIdentifier extends HttpApiGroup.EndpointsWithIdentifier<Groups, GroupIdentifier>["identifier"],
  E,
  R,
  Options = {},
  Mapper extends
    | MapperFn<
      Client.MethodError<EndpointWithIdentifier<Groups, GroupIdentifier, EndpointIdentifier>, NoInfer<E>>,
      Client.Info<GroupIdentifier, EndpointIdentifier>
    >
    | undefined = undefined
>(
  api: HttpApi.HttpApi<ApiId, Groups>,
  options:
    & TransformResponseOptions<Client.Info<GroupIdentifier, EndpointIdentifier>>
    & MapErrorOption<
      Mapper,
      Client.MethodError<EndpointWithIdentifier<Groups, GroupIdentifier, EndpointIdentifier>, NoInfer<E>>,
      Client.Info<GroupIdentifier, EndpointIdentifier>
    >
    & {
      readonly group: GroupIdentifier
      readonly endpoint: EndpointIdentifier
      readonly httpClient: HttpClient.HttpClient.With<E, R>
      readonly transformClient?:
        | ((client: HttpClient.HttpClient.With<E, R>) => HttpClient.HttpClient.With<E, R>)
        | undefined
    }
    & InferredOptions<Options>
): EndpointReturn<
  EndpointWithIdentifier<Groups, GroupIdentifier, EndpointIdentifier>,
  E,
  R,
  MappingOf<Options, Mapper>
> => {
  let client: any = undefined
  return makeClient(api, {
    ...options as MakeClientOptions<E, R>,
    httpClient: options.transformClient
      ? options.transformClient(options.httpClient)
      : options.httpClient,
    predicate: ({ endpoint, group }) => group.identifier === options.group && endpoint.identifier === options.endpoint,
    onEndpoint({ endpointFn }) {
      client = endpointFn
    }
  }).pipe(Effect.map(() => client)) as any
}

/**
 * Creates a type-safe URL builder that mirrors `HttpApiClient.make`.
 *
 * **Example** (Building typed URLs)
 *
 * ```ts import.meta.vitest
 * import { Schema } from "effect"
 * import { HttpApi, HttpApiClient, HttpApiEndpoint, HttpApiGroup } from "effect/http-api"
 *
 * const Api = HttpApi.make("Api").add(
 *   HttpApiGroup.make("users").add(
 *     HttpApiEndpoint.get("getUser", "/users/:id", {
 *       params: { id: Schema.String }
 *     })
 *   )
 * )
 *
 * const buildUrl = HttpApiClient.urlBuilder(Api, {
 *   baseUrl: "https://api.example.com"
 * })
 *
 * buildUrl.users.getUser({
 *   params: { id: "123" }
 * }) // => "https://api.example.com/users/123"
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const urlBuilder = <Api extends HttpApi.Constraint>(api: Api, options?: {
  readonly baseUrl?: URL | string | undefined
}): UrlBuilder<Api> => {
  const builder: Record<string, any> = {}

  HttpApi.reflect(api as unknown as HttpApi.Top, {
    onGroup({ group }) {
      if (group.topLevel) return
      InternalRecord.assignProperty(builder, group.identifier, {})
    },
    onEndpoint({ group, endpoint, mergedAnnotations }) {
      const parseOptions = HttpApi.getSlotParseOptions(mergedAnnotations)
      const makeUrl = compilePath(endpoint.path, endpoint.params)
      const encodeParams = endpoint.params === undefined
        ? undefined
        : Schema.encodeSync(endpoint.params as unknown as Schema.ConstraintEncoder<unknown>, parseOptions.params)
      const encodeQuery = endpoint.query === undefined
        ? undefined
        : Schema.encodeSync(endpoint.query as unknown as Schema.ConstraintEncoder<unknown>, parseOptions.query)

      const endpointBuilder = (request?: {
        readonly params?: unknown
        readonly query?: unknown
      }) => {
        const params = request?.params
        const path = params === undefined
          ? endpoint.path
          : makeUrl((encodeParams === undefined ? params : encodeParams(params)) as Record<string, string | undefined>)
        const queryInput = request?.query === undefined
          ? undefined
          : (encodeQuery === undefined ? request.query : encodeQuery(request.query)) as UrlParams.Input
        const urlParams = queryInput === undefined ? UrlParams.empty : UrlParams.fromInput(queryInput)
        if (options?.baseUrl === undefined) {
          const query = UrlParams.toString(urlParams)
          return query === "" ? path : `${path}?${query}`
        }
        const url = new URL(
          HttpClientRequest.prependUrl(HttpClientRequest.get(path), options.baseUrl.toString()).url
        )
        for (const [key, value] of urlParams.params) {
          if (value !== undefined) {
            url.searchParams.append(key, internalUrlParams.unwrap(value))
          }
        }
        return url.toString()
      }
      InternalRecord.assignProperty(
        group.topLevel ? builder : builder[group.identifier],
        endpoint.identifier,
        endpointBuilder
      )
    }
  })

  return builder as UrlBuilder<Api>
}

// ----------------------------------------------------------------------------

const compilePath = (path: string, schema: Schema.Top | undefined) => {
  if (schema === undefined || !path.includes(":")) {
    return (_: any) => path
  }
  const paramNames = HttpApiPath.getParamNames(schema)
  return (params: Record<string, string | undefined>) =>
    HttpApiPath.replaceParams(path, paramNames, (key, optional) => {
      const value = params[key]
      if (value === "." || value === "..") {
        // dot segments survive encoding and would be resolved by URL normalization
        throw new Error(`Invalid path parameter: ${key}`)
      }
      if (value !== undefined) return encodeURIComponent(value)
      if (optional) return undefined
      throw new Error(`Missing path parameter: ${key}`)
    })
}

function schemasToResponse(
  schemas: readonly [Schema.Constraint, ...Array<Schema.Constraint>],
  options: SchemaAST.ParseOptions | undefined,
  headersOptions: SchemaAST.ParseOptions | undefined
): ResponseDecoder {
  const hasWithHeaders = schemas.some((schema) =>
    HttpApiSchema.isWithHeaders(schema) || HttpApiSchema.getWithHeadersAnnotation(schema.ast) !== undefined
  )
  const codec = hasWithHeaders
    ? Schema.Union(schemas.map((schema) => toCodecArrayBufferWithHeaders(schema, options, headersOptions)))
    : toCodecArrayBuffer(schemas)
  const decode = Schema.decodeUnknownEffect(codec, options)
  return (response) =>
    Effect.flatMap(
      response.arrayBuffer,
      hasWithHeaders
        ? (body) => decode({ body, headers: response.headers })
        : decode
    )
}

const ResponsePair = Schema.Struct({ body: Schema.Unknown, headers: Schema.Unknown })

// Decodes the body with `options` and the headers with `headersOptions`, so
// they are not applied from the outer decode.
function toCodecArrayBufferWithHeaders(
  schema: Schema.Constraint,
  options: SchemaAST.ParseOptions | undefined,
  headersOptions: SchemaAST.ParseOptions | undefined
): Schema.Top {
  const annotation = HttpApiSchema.getWithHeadersAnnotation(schema.ast)
  const parts: {
    readonly body: Schema.Constraint
    readonly headers: Schema.Top
    readonly toValue: (pair: { readonly body: unknown; readonly headers: unknown }) => unknown
  } = annotation !== undefined
    ? { body: annotation.bodyCodec, headers: annotation.headersCodec, toValue: annotation.transformation.decode }
    : HttpApiSchema.isWithHeaders(schema)
    ? { body: schema.schema, headers: schema.headers, toValue: HttpApiSchema.withHeaders }
    : { body: schema, headers: Schema.Unknown, toValue: (pair) => pair.body }
  const decodeBody = Schema.decodeUnknownEffect(fromArrayBuffer(parts.body).pipe(Schema.decodeTo(parts.body)), options)
  const decodeHeaders = Schema.decodeUnknownEffect(parts.headers, headersOptions)
  return ResponsePair.pipe(Schema.decodeTo(
    HttpApiSchema.isWithHeaders(schema) ? schema : Schema.toType(schema),
    SchemaTransformation.transformEffect<unknown, typeof ResponsePair.Type, unknown, never>({
      decode: (pair) =>
        Effect.all({ body: decodeBody(pair.body), headers: decodeHeaders(pair.headers) }).pipe(
          Effect.map(parts.toValue),
          Effect.mapError((error) => error.issue)
        ),
      encode: (input, options) =>
        Effect.fail(new SchemaIssue.Forbidden({ message: "Decode only schema" }, input, options))
    })
  ))
}

type ResponseDecoder = (
  response: HttpClientResponse.HttpClientResponse,
  sseOptions?: Sse.DecodeOptions
) => Effect.Effect<unknown, unknown, unknown>

interface ResponseAlternative {
  readonly contentType: string
  readonly decode: ResponseDecoder
}

function addResponseAlternative(
  map: Map<number, Array<ResponseAlternative>>,
  status: number,
  contentType: string,
  decode: ResponseDecoder
) {
  const normalizedContentType = MediaType.normalize(contentType)
  const alternatives = map.get(status)
  if (alternatives === undefined) {
    map.set(status, [{ contentType: normalizedContentType, decode }])
  } else {
    alternatives.push({ contentType: normalizedContentType, decode })
  }
}

function makeResponseDecoder(alternatives: ReadonlyArray<ResponseAlternative>): ResponseDecoder {
  const first = alternatives[0]
  if (alternatives.length === 1 && first !== undefined) {
    return first.decode
  }
  return (response, sseOptions) => {
    const contentType = MediaType.normalize(response.headers["content-type"] ?? "")
    const alternative = alternatives.find((alternative) => alternative.contentType === contentType)
    return alternative === undefined
      ? failUnsupportedContentType(response, contentType, alternatives)
      : alternative.decode(response, sseOptions)
  }
}

function groupSchemasByContentType(
  schemas: Arr.NonEmptyReadonlyArray<Schema.Top>
): Map<string, Arr.NonEmptyReadonlyArray<Schema.Top>> {
  const grouped = new Map<string, [Schema.Top, ...Array<Schema.Top>]>()
  for (const schema of schemas) {
    const body = HttpApiSchema.isWithHeaders(schema) ? schema.schema : schema
    const contentType = HttpApiSchema.isNoContent(body.ast)
      ? ""
      : MediaType.normalize(HttpApiSchema.getResponseEncodingSchema(schema).contentType)
    const existing = grouped.get(contentType)
    if (existing === undefined) {
      grouped.set(contentType, [schema])
    } else {
      existing.push(schema)
    }
  }
  return grouped
}

function failUnsupportedContentType(
  response: HttpClientResponse.HttpClientResponse,
  contentType: string,
  alternatives: ReadonlyArray<ResponseAlternative>
) {
  const expected = Array.from(new Set(alternatives.map((alternative) => alternative.contentType))).join(", ")
  return Effect.fail(
    new HttpClientError.HttpClientError({
      reason: new HttpClientError.DecodeError({
        request: response.request,
        response,
        description: `Unsupported response content-type for status ${response.status}: ${
          contentType || "<missing>"
        }. Expected one of: ${expected}`
      })
    })
  )
}

// An endpoint can succeed with a stream on one status and a plain value on
// another, so streams are detected per call
function mapStreamError(value: unknown, f: (error: unknown) => unknown): unknown {
  if (Stream.isStream(value)) {
    return Stream.mapError(value, f)
  }
  if (HttpApiSchema.isWithHeadersValue(value) && Stream.isStream(value.body)) {
    return HttpApiSchema.withHeaders({ body: Stream.mapError(value.body, f), headers: value.headers })
  }
  return value
}

const reservedStreamFailureEvent = "effect/http-api/stream/failure"

type StreamSuccessSchema =
  | HttpApiSchema.StreamSchema
  | HttpApiSchema.WithHeaders<HttpApiSchema.StreamSchema, Schema.Top>

const isWithHeadersStreamSuccess = (
  schema: StreamSuccessSchema
): schema is HttpApiSchema.WithHeaders<HttpApiSchema.StreamSchema, Schema.Top> => HttpApiSchema.isWithHeaders(schema)

function getUpgradeSuccessSchema(endpoint: HttpApiEndpoint.Top): HttpApiSchema.Upgrade | undefined {
  for (const schema of endpoint.success) {
    if (HttpApiSchema.isUpgrade(schema)) return schema
  }
}

function getStreamSuccessSchemas(endpoint: HttpApiEndpoint.Top): Array<StreamSuccessSchema> {
  const schemas: Array<StreamSuccessSchema> = []
  for (const schema of endpoint.success) {
    const body = HttpApiSchema.isWithHeaders(schema) ? schema.schema : schema
    if (HttpApiSchema.isStreamSchema(body)) {
      schemas.push(schema as StreamSuccessSchema)
    }
  }
  return schemas
}

function streamToResponse(
  successSchema: StreamSuccessSchema,
  options: SchemaAST.ParseOptions | undefined,
  headersOptions: SchemaAST.ParseOptions | undefined
) {
  const isWithHeaders = isWithHeadersStreamSuccess(successSchema)
  const streamSchema = isWithHeaders ? successSchema.schema : successSchema
  const decodeBody = makeStreamBodyDecoder(streamSchema, options)
  const toStream: ResponseDecoder = (response, sseOptions) =>
    Effect.map(Effect.context<never>(), (context) =>
      Stream.provideContext(
        decodeBody(response, sseOptions),
        context as Context.Context<unknown>
      ))
  if (!isWithHeaders) return toStream

  const decodeHeaders = Schema.decodeUnknownEffect(successSchema.headers, headersOptions)
  return (response: HttpClientResponse.HttpClientResponse, sseOptions?: Sse.DecodeOptions) =>
    Effect.flatMap(
      decodeHeaders(response.headers),
      (headers) => Effect.map(toStream(response, sseOptions), (body) => HttpApiSchema.withHeaders({ body, headers }))
    )
}

function makeStreamBodyDecoder(
  streamSchema: HttpApiSchema.StreamSchema,
  options: SchemaAST.ParseOptions | undefined
): (
  response: HttpClientResponse.HttpClientResponse,
  sseOptions: Sse.DecodeOptions | undefined
) => Stream.Stream<unknown, unknown, unknown> {
  if (HttpApiSchema.isStreamUint8Array(streamSchema)) {
    return (response) => response.stream
  }
  if (HttpApiSchema.isStreamNdjson(streamSchema)) {
    const decodeElement = Schema.decodeUnknownEffect(Schema.toCodecJson(streamSchema.schema), options)
    const maxElementBytes = ByteSize.toNumberUnsafe(streamSchema.maxElementBytes)
    return (response) =>
      response.stream.pipe(
        Stream.pipeThroughChannel(Ndjson.decode({ ignoreEmptyLines: true, maxLineBytes: maxElementBytes })),
        Stream.mapError((error) => {
          if (!Ndjson.isNdjsonError(error)) return error
          if (error.reason !== "LineTooLarge") return ndjsonSchemaError(error)
          return new HttpClientError.HttpClientError({
            reason: new HttpClientError.DecodeError({
              request: response.request,
              response,
              description: `NDJSON line exceeds maxElementBytes of ${maxElementBytes} bytes`
            })
          })
        }),
        Stream.mapEffect((json) => decodeElement(json))
      )
  }
  const decoder = makeSseDecoder(streamSchema, options)
  return (response, sseOptions) => decodeSseStream(response.stream, streamSchema, decoder(sseOptions))
}

// `JSON.stringify` found no JSON representation for an encoded element
const isNdjsonPackError = (error: unknown): error is Ndjson.NdjsonError =>
  Ndjson.isNdjsonError(error) && error.kind === "Pack"

const ndjsonSchemaError = (error: Ndjson.NdjsonError): Schema.SchemaError =>
  new Schema.SchemaError(
    new SchemaIssue.InvalidValue({
      message: error.reason === "InvalidUtf8"
        ? "Expected valid UTF-8"
        : error.unterminated
        ? "Expected a valid JSON line, got an unterminated final line"
        : "Expected a valid JSON line"
    })
  )

function makeSseDecoder(
  declaration: HttpApiSchema.StreamSse<Sse.EventCodec, Schema.Constraint, unknown>,
  parseOptions: SchemaAST.ParseOptions | undefined
) {
  const Event = Schema.Union([
    Schema.Struct({
      id: Schema.optional(Schema.String),
      event: Schema.Literal(reservedStreamFailureEvent),
      data: Schema.fromJsonString(Schema.toCodecJson(Schema.Cause(declaration.error, Schema.Defect())))
    }),
    declaration.events
  ])
  const defaultDecoder = Sse.decodeSchema(Event, undefined, parseOptions)
  return (options?: Sse.DecodeOptions) =>
    options === undefined ? defaultDecoder : Sse.decodeSchema(Event, options, parseOptions)
}

function decodeSseStream(
  stream: Stream.Stream<Uint8Array, HttpClientError.HttpClientError>,
  declaration: HttpApiSchema.StreamSse<Sse.EventCodec, Schema.Constraint, unknown>,
  decoder: ReturnType<ReturnType<typeof makeSseDecoder>>
): Stream.Stream<unknown, unknown, unknown> {
  const events = Stream.transformPull(
    stream.pipe(
      Stream.decodeText,
      Stream.pipeThroughChannel(decoder)
    ),
    (pull) =>
      Effect.sync(() => {
        let pendingFailureCause: Cause.Cause<unknown> | undefined = undefined
        return Effect.suspend(() => {
          if (pendingFailureCause !== undefined) {
            return Effect.failCause(pendingFailureCause)
          }
          return Effect.flatMap(pull, (events) => {
            for (let i = 0; i < events.length; i++) {
              const event = events[i]
              if (event.event === reservedStreamFailureEvent && Cause.isCause(event.data)) {
                if (i === 0) {
                  return Effect.failCause(event.data)
                }
                pendingFailureCause = event.data
                events = events.slice(0, i) as any
                break
              }
            }
            return Effect.succeed(events)
          })
        })
      })
  )
  if (declaration.sseMode === "data") {
    return Stream.map(events, (event) => event.data)
  }
  return events
}

const ArrayBuffer = Schema.instanceOf(globalThis.ArrayBuffer, {
  expected: "ArrayBuffer"
})

// _tag: Uint8Array
const Uint8ArrayFromArrayBuffer = ArrayBuffer.pipe(
  Schema.decodeTo(
    Schema.Uint8Array as Schema.instanceOf<Uint8Array<ArrayBuffer>>,
    SchemaTransformation.transform({
      decode(fromA) {
        return new Uint8Array(fromA)
      },
      encode(arr) {
        return arr.byteLength === arr.buffer.byteLength ?
          arr.buffer :
          arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)
      }
    })
  )
)

// _tag: Text
const StringFromArrayBuffer = ArrayBuffer.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode(fromA) {
        return new TextDecoder().decode(fromA)
      },
      encode(toI) {
        const arr = new TextEncoder().encode(toI) as Uint8Array<ArrayBuffer>
        return arr.byteLength === arr.buffer.byteLength ?
          arr.buffer :
          arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)
      }
    })
  )
)

// _tag: Json
const UnknownFromArrayBuffer = StringFromArrayBuffer.pipe(Schema.decodeTo(
  Schema.Union([
    // Handle No Content
    Schema.Literal("").pipe(Schema.decodeTo(
      Schema.Undefined,
      SchemaTransformation.transform({
        decode: () => undefined,
        encode: () => ""
      })
    )),
    Schema.UnknownFromJsonString
  ])
))

function toCodecArrayBuffer(schemas: readonly [Schema.Constraint, ...Array<Schema.Constraint>]): Schema.Top {
  return Schema.Union(schemas.map(onSchema))

  function onSchema(schema: Schema.Constraint) {
    return fromArrayBuffer(schema).pipe(Schema.decodeTo(schema))
  }
}

function fromArrayBuffer(schema: Schema.Constraint): Schema.Top {
  const encoding = HttpApiSchema.getResponseEncoding(schema.ast)
  switch (encoding._tag) {
    case "Json": {
      // handle json codecs that transform void schemas to null
      const encodedIsNull = SchemaAST.isNull(SchemaAST.toEncoded(schema.ast))
      return encodedIsNull
        ? UnknownFromArrayBuffer.pipe(
          Schema.decodeTo(
            Schema.Unknown,
            SchemaTransformation.transform({
              decode: (a) => a === undefined ? null : a,
              encode: (a) => a === null ? undefined : a
            }) as any
          )
        )
        : UnknownFromArrayBuffer
    }
    case "FormUrlEncoded":
      return StringFromArrayBuffer.pipe(Schema.decodeTo(
        Schema.RecordFromUrlParams,
        SchemaTransformation.transform({
          decode: (text) => UrlParams.fromInput(new URLSearchParams(text)),
          encode: UrlParams.toString
        })
      ))
    case "Uint8Array":
      return Uint8ArrayFromArrayBuffer
    case "Text":
      return StringFromArrayBuffer
  }
}

const statusOrElse = (response: HttpClientResponse.HttpClientResponse) =>
  Effect.fail(
    new HttpClientError.HttpClientError({
      reason: new HttpClientError.DecodeError({
        request: response.request,
        response
      })
    })
  )

const $HttpBody = Schema.declare(HttpBody.isHttpBody)

type StreamPayloadSchema = HttpApiSchema.StreamUint8Array | HttpApiSchema.StreamNdjson<Schema.Top>

function makeStreamPayloadEncoder(
  schema: StreamPayloadSchema,
  options: SchemaAST.ParseOptions | undefined
): (stream: Stream.Stream<unknown, unknown, unknown>) => Stream.Stream<Uint8Array, unknown, unknown> {
  if (HttpApiSchema.isStreamUint8Array(schema)) {
    return (stream) => stream as Stream.Stream<Uint8Array, unknown, unknown>
  }
  const encodeElements = Schema.encodeUnknownEffect(Schema.NonEmptyArray(Schema.toCodecJson(schema.schema)), options)
  return (stream) =>
    stream.pipe(
      Stream.mapArrayEffect((elements) => encodeElements(elements)),
      Stream.pipeThroughChannel(Ndjson.encode()),
      Stream.catchIf(isNdjsonPackError, Stream.die)
    )
}

function getEncodePayloadSchema(
  schemas: readonly [Schema.Constraint, ...Array<Schema.Constraint>],
  method: HttpMethod.HttpMethod
): Schema.Top {
  return Schema.Union(schemas.map((s) => getEncodePayloadSchemaFromBody(s, method)))
}

const bodyFromPayloadCache = new WeakMap<SchemaAST.AST, Schema.Top>()

function getEncodePayloadSchemaFromBody(
  schema: Schema.Constraint,
  method: HttpMethod.HttpMethod
): Schema.Top {
  const ast = schema.ast
  const cached = bodyFromPayloadCache.get(ast)
  if (cached !== undefined) {
    return cached
  }
  const encoding = HttpApiSchema.getPayloadEncoding(ast, method)
  const out = $HttpBody.pipe(Schema.decodeTo(
    schema,
    SchemaTransformation.transformEffect<unknown, HttpBody.HttpBody>({
      decode(input, options) {
        return Effect.fail(
          new SchemaIssue.Forbidden({ message: "Encode only schema" }, input, options)
        )
      },
      encode(t, options) {
        switch (encoding._tag) {
          case "Multipart":
            return Effect.fail(
              new SchemaIssue.Forbidden(
                { message: "Payload must be a FormData" },
                t,
                options
              )
            )
          case "Json": {
            try {
              const body = JSON.stringify(t)
              return Effect.succeed(HttpBody.text(body, encoding.contentType))
            } catch {
              return Effect.fail(
                new SchemaIssue.InvalidValue(
                  { expected: "a JSON-serializable request body" },
                  t,
                  options
                )
              )
            }
          }
          case "Text": {
            if (typeof t !== "string") {
              return Effect.fail(
                new SchemaIssue.InvalidValue({ message: "Expected a string" }, t, options)
              )
            }
            return Effect.succeed(HttpBody.text(t, encoding.contentType))
          }
          case "FormUrlEncoded": {
            if (!Predicate.isObject(t)) {
              return Effect.fail(
                new SchemaIssue.InvalidValue({ message: "Expected a record" }, t, options)
              )
            }
            return Effect.succeed(HttpBody.urlParams(UrlParams.fromInput(t as any), encoding.contentType))
          }
          case "Uint8Array": {
            if (!(t instanceof Uint8Array)) {
              return Effect.fail(
                new SchemaIssue.InvalidValue(
                  { message: "Expected a Uint8Array" },
                  t,
                  options
                )
              )
            }
            return Effect.succeed(HttpBody.uint8Array(t, encoding.contentType))
          }
        }
      }
    })
  ))
  bodyFromPayloadCache.set(ast, out)
  return out
}
