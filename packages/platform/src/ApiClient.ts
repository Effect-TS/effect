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
import type { Api } from "./Api.js"
import type { ApiEndpoint } from "./ApiEndpoint.js"
import type { ApiGroup } from "./ApiGroup.js"
import { reflect } from "./ApiReflection.js"
import * as HttpClient from "./HttpClient.js"
import * as HttpClientError from "./HttpClientError.js"
import * as HttpClientRequest from "./HttpClientRequest.js"
import * as HttpClientResponse from "./HttpClientResponse.js"
import * as HttpMethod from "./HttpMethod.js"

/**
 * @since 1.0.0
 * @category models
 */
export type Client<A extends Api.Any> = [A] extends [Api<infer _Groups, infer _ApiError, infer _ApiErrorR>] ? {
    readonly [GroupName in _Groups["name"]]: ApiGroup.WithName<_Groups, GroupName> extends
      ApiGroup<infer _, infer _Endpoints, infer _GroupError, infer _GroupErrorR> ? {
        readonly [Name in _Endpoints["name"]]: (
          request: Simplify<ApiEndpoint.ClientRequest<ApiGroup.WithName<_Endpoints, Name>>>
        ) => Effect.Effect<
          ApiEndpoint.SuccessWithName<_Endpoints, Name>,
          ApiEndpoint.ErrorWithName<_Endpoints, Name> | _GroupError | _ApiError
        >
      } :
      never
  } :
  never

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <A extends Api.Any>(
  api: A,
  options?: {
    readonly transformClient?: ((client: HttpClient.HttpClient.Default) => HttpClient.HttpClient.Default) | undefined
    readonly baseUrl?: string | undefined
  }
): Effect.Effect<Simplify<Client<A>>, never, Api.Context<A> | HttpClient.HttpClient.Default> =>
  Effect.gen(function*() {
    const context = yield* Effect.context<any>()
    const httpClient = (yield* HttpClient.HttpClient).pipe(
      options?.baseUrl === undefined ? identity : HttpClient.mapRequest(HttpClientRequest.prependUrl(options.baseUrl)),
      options?.transformClient === undefined ? identity : options.transformClient
    )
    const client: Record<string, Record<string, any>> = {}
    reflect(api as any, {
      mode: "full",
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
          }
          const decode = Schema.decodeUnknown(Schema.make(error))
          return response.json.pipe(
            Effect.flatMap(decode),
            Effect.matchEffect({
              onFailure: () =>
                Effect.die(
                  new HttpClientError.ResponseError({
                    reason: "Decode",
                    request,
                    response
                  })
                ),
              onSuccess: Effect.fail
            })
          )
        }
        const encodePayload = Option.map(endpoint.payloadSchema, Schema.encodeUnknown)
        client[group.name][endpoint.name] = (request: {
          readonly path: any
          readonly payload: any
        }) => {
          const url = request && request.path ? makeUrl(request && request.path) : endpoint.path
          const baseRequest = HttpClientRequest.make(endpoint.method)(url)
          return (encodePayload._tag === "Some" ?
            encodePayload.value(request.payload).pipe(
              Effect.flatMap((payload) =>
                HttpMethod.hasBody(endpoint.method)
                  ? HttpClientRequest.jsonBody(baseRequest, payload)
                  : Effect.succeed(HttpClientRequest.setUrlParams(baseRequest, payload))
              ),
              Effect.orDie
            ) :
            Effect.succeed(baseRequest)).pipe(
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