/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Option from "effect/Option"
import type { Simplify } from "effect/Types"
import { unify } from "effect/Unify"
import * as HttpApi from "./HttpApi.js"
import type { HttpApiEndpoint } from "./HttpApiEndpoint.js"
import type { HttpApiGroup } from "./HttpApiGroup.js"
import * as HttpApiSchema from "./HttpApiSchema.js"
import * as HttpClient from "./HttpClient.js"
import * as HttpClientError from "./HttpClientError.js"
import * as HttpClientRequest from "./HttpClientRequest.js"
import * as HttpClientResponse from "./HttpClientResponse.js"
import * as HttpMethod from "./HttpMethod.js"

/**
 * @since 1.0.0
 * @category models
 */
export type Client<A extends HttpApi.HttpApi.Any> = [A] extends
  [HttpApi.HttpApi<infer _Groups, infer _ApiError, infer _ApiErrorR>] ? {
    readonly [GroupName in _Groups["name"]]: [HttpApiGroup.WithName<_Groups, GroupName>] extends
      [HttpApiGroup<GroupName, infer _Endpoints, infer _GroupError, infer _GroupErrorR>] ? {
        readonly [Name in _Endpoints["name"]]: [HttpApiEndpoint.WithName<_Endpoints, Name>] extends [
          HttpApiEndpoint<
            Name,
            infer _Method,
            infer _Path,
            infer _Payload,
            infer _Success,
            infer _Error,
            infer _R
          >
        ] ? (
            request: Simplify<HttpApiEndpoint.ClientRequest<_Path, _Payload>>
          ) => Effect.Effect<
            _Success,
            _Error | _GroupError | _ApiError | HttpClientError.HttpClientError
          > :
          never
      } :
      never
  } :
  never

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <A extends HttpApi.HttpApi.Any>(
  api: A,
  options?: {
    readonly transformClient?: ((client: HttpClient.HttpClient.Default) => HttpClient.HttpClient.Default) | undefined
    readonly baseUrl?: string | undefined
  }
): Effect.Effect<Simplify<Client<A>>, never, HttpApi.HttpApi.Context<A> | HttpClient.HttpClient.Default> =>
  Effect.gen(function*() {
    const context = yield* Effect.context<any>()
    const httpClient = (yield* HttpClient.HttpClient).pipe(
      options?.baseUrl === undefined ? identity : HttpClient.mapRequest(HttpClientRequest.prependUrl(options.baseUrl)),
      options?.transformClient === undefined ? identity : options.transformClient
    )
    const client: Record<string, Record<string, any>> = {}
    HttpApi.reflect(api as any, {
      onGroup({ group }) {
        client[group.name] = {}
      },
      onEndpoint({ endpoint, errors, group, success }) {
        const makeUrl = compilePath(endpoint.path)
        const handleSuccess = unify(Option.match(success[0], {
          onNone: () => HttpClientResponse.void,
          onSome: (ast) => HttpClientResponse.schemaBodyJsonScoped(Schema.make(ast))
        }))
        const handleError = (
          request: HttpClientRequest.HttpClientRequest,
          response: HttpClientResponse.HttpClientResponse
        ) => {
          const error = errors.get(response.status)
          if (error === undefined) {
            return Effect.die(
              new HttpClientError.ResponseError({
                reason: "Decode",
                request,
                response
              })
            )
          } else if (Option.isNone(error)) {
            return Effect.fail(
              new HttpClientError.ResponseError({
                reason: "StatusCode",
                request,
                response
              })
            )
          }
          const decode = Schema.decodeUnknown(Schema.make(error.value))
          return response.text.pipe(
            Effect.flatMap((text) =>
              text === "" ? Effect.void : Effect.try({
                try: () => JSON.parse(text),
                catch: (cause) =>
                  new HttpClientError.ResponseError({
                    reason: "Decode",
                    request,
                    response,
                    cause
                  })
              })
            ),
            Effect.flatMap((json) =>
              Effect.mapError(decode(json), (cause) =>
                new HttpClientError.ResponseError({
                  reason: "Decode",
                  request,
                  response,
                  cause
                }))
            ),
            Effect.flatMap(Effect.fail)
          )
        }
        const isMultipart = endpoint.payloadSchema.pipe(
          Option.map((schema) => HttpApiSchema.getMultipart(schema.ast)),
          Option.getOrElse(() => false)
        )
        const encodePayload = endpoint.payloadSchema.pipe(
          Option.filter(() => !isMultipart),
          Option.map(Schema.encodeUnknown)
        )
        client[group.name][endpoint.name] = (request: {
          readonly path: any
          readonly payload: any
        }) => {
          const url = request && request.path ? makeUrl(request && request.path) : endpoint.path
          const baseRequest = HttpClientRequest.make(endpoint.method)(url)
          return (isMultipart ?
            Effect.succeed(baseRequest.pipe(
              HttpClientRequest.formDataBody(request.payload)
            ))
            : encodePayload._tag === "Some"
            ? encodePayload.value(request.payload).pipe(
              Effect.flatMap((payload) =>
                HttpMethod.hasBody(endpoint.method)
                  ? HttpClientRequest.jsonBody(baseRequest, payload)
                  : Effect.succeed(HttpClientRequest.setUrlParams(baseRequest, payload as any))
              ),
              Effect.orDie
            )
            : Effect.succeed(baseRequest)).pipe(
              Effect.flatMap((request) =>
                httpClient(request).pipe(
                  Effect.orDie,
                  Effect.flatMap((response) =>
                    response.status !== success[1] ? handleError(request, response) : Effect.succeed(response)
                  )
                )
              ),
              handleSuccess,
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
