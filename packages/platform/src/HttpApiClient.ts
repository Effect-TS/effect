/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import type { Scope } from "effect/Scope"
import type { Simplify } from "effect/Types"
import * as HttpApi from "./HttpApi.js"
import type { HttpApiEndpoint } from "./HttpApiEndpoint.js"
import type { HttpApiGroup } from "./HttpApiGroup.js"
import * as HttpApiSchema from "./HttpApiSchema.js"
import * as HttpClient from "./HttpClient.js"
import * as HttpClientError from "./HttpClientError.js"
import * as HttpClientRequest from "./HttpClientRequest.js"
import * as HttpClientResponse from "./HttpClientResponse.js"
import * as HttpMethod from "./HttpMethod.js"
import type { HttpApiMiddleware } from "./index.js"

/**
 * @since 1.0.0
 * @category models
 */
export type Client<Groups extends HttpApiGroup.Any, ApiError> = Simplify<
  & {
    readonly [Group in Extract<Groups, { readonly topLevel: false }> as HttpApiGroup.Name<Group>]: [Group] extends
      [HttpApiGroup<infer _GroupName, infer _Endpoints, infer _GroupError, infer _GroupErrorR>] ? {
        readonly [Endpoint in _Endpoints as HttpApiEndpoint.Name<Endpoint>]: Client.Method<
          Endpoint,
          ApiError,
          _GroupError
        >
      } :
      never
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
  ] ? (
      request: Simplify<HttpApiEndpoint.ClientRequest<_Path, _UrlParams, _Payload, _Headers>>
    ) => Effect.Effect<
      _Success,
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
      _Endpoints extends infer Endpoint ? [HttpApiEndpoint.Name<Endpoint>, Client.Method<Endpoint, ApiError, _Error>]
      : never :
      never
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Groups extends HttpApiGroup.Any, ApiError, ApiR>(
  api: HttpApi.HttpApi<Groups, ApiError, ApiR>,
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
> =>
  Effect.gen(function*() {
    const context = yield* Effect.context<any>()
    const httpClient = (yield* HttpClient.HttpClient).pipe(
      options?.baseUrl === undefined ? identity : HttpClient.mapRequest(HttpClientRequest.prependUrl(options.baseUrl)),
      options?.transformClient === undefined ? identity : options.transformClient
    )
    const client: Record<string, Record<string, any>> = {}
    HttpApi.reflect(api as any, {
      onGroup({ group }) {
        if (group.topLevel) return
        client[group.identifier] = {}
      },
      onEndpoint({ endpoint, errors, group, successes }) {
        const makeUrl = compilePath(endpoint.path)
        const decodeMap: Record<
          number | "orElse",
          (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<any, any>
        > = { orElse: statusOrElse }
        errors.forEach((ast, status) => {
          if (ast._tag === "None") {
            decodeMap[status] = statusCodeError
            return
          }
          const decode = schemaToResponse(ast.value)
          decodeMap[status] = (response) => Effect.flatMap(decode(response), Effect.fail)
        })
        successes.forEach((ast, status) => {
          decodeMap[status] = ast._tag === "None" ? responseAsVoid : schemaToResponse(ast.value)
        })
        const isMultipart = endpoint.payloadSchema.pipe(
          Option.map((schema) => HttpApiSchema.getMultipart(schema.ast)),
          Option.getOrElse(() => false)
        )
        const encodePayload = endpoint.payloadSchema.pipe(
          Option.filter(() => !isMultipart),
          Option.map(Schema.encodeUnknown)
        )
        const encodeHeaders = endpoint.headersSchema.pipe(
          Option.map(Schema.encodeUnknown)
        )
        const encodeUrlParams = endpoint.urlParamsSchema.pipe(
          Option.map(Schema.encodeUnknown)
        )
        ;(group.topLevel ? client : client[group.identifier])[endpoint.name] = (request: {
          readonly path: any
          readonly urlParams: any
          readonly payload: any
          readonly headers: any
        }) => {
          const url = request && request.path ? makeUrl(request.path) : endpoint.path
          const baseRequest = HttpClientRequest.make(endpoint.method)(url)
          return (isMultipart ?
            Effect.succeed(baseRequest.pipe(
              HttpClientRequest.bodyFormData(request.payload)
            ))
            : encodePayload._tag === "Some"
            ? encodePayload.value(request.payload).pipe(
              Effect.flatMap((payload) =>
                HttpMethod.hasBody(endpoint.method)
                  ? HttpClientRequest.bodyJson(baseRequest, payload)
                  : Effect.succeed(HttpClientRequest.setUrlParams(baseRequest, payload as any))
              ),
              Effect.orDie
            )
            : Effect.succeed(baseRequest)).pipe(
              encodeHeaders._tag === "Some"
                ? Effect.flatMap((httpRequest) =>
                  encodeHeaders.value(request.headers).pipe(
                    Effect.orDie,
                    Effect.map((headers) => HttpClientRequest.setHeaders(httpRequest, headers as any))
                  )
                )
                : identity,
              encodeUrlParams._tag === "Some"
                ? Effect.flatMap((httpRequest) =>
                  encodeUrlParams.value(request.urlParams).pipe(
                    Effect.orDie,
                    Effect.map((params) => HttpClientRequest.appendUrlParams(httpRequest, params as any))
                  )
                )
                : identity,
              Effect.flatMap(httpClient.execute),
              Effect.flatMap(HttpClientResponse.matchStatus(decodeMap)),
              options?.transformResponse === undefined ? identity : options.transformResponse,
              Effect.scoped,
              Effect.catchIf(ParseResult.isParseError, Effect.die),
              Effect.mapInputContext((input) => Context.merge(context, input))
            )
        }
      }
    })
    return client as any
  })

// ----------------------------------------------------------------------------

const paramsRegex = /:(\w+)[^/]*/g

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
