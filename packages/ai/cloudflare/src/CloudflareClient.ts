/**
 * HTTP client for Cloudflare Clef decisions and Clairic extractions through
 * Workers AI REST.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as AiError from "effect/ai/AiError"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { flow, identity } from "effect/Function"
import * as HttpClient from "effect/http/HttpClient"
import type * as HttpClientError from "effect/http/HttpClientError"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as CloudflareSchema from "./CloudflareSchema.ts"
import * as Errors from "./internal/errors.ts"

/**
 * Low-level Cloudflare decision and extraction operations.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export interface Service {
  readonly client: HttpClient.HttpClient
  readonly createDecisions: (
    request: typeof CloudflareSchema.DecisionsRequest.Encoded
  ) => Effect.Effect<typeof CloudflareSchema.DecisionsResponse.Type, AiError.AiError>
  /**
   * Answers typed fields with a Clairic model.
   *
   * @since 4.0.6
   */
  readonly createExtractions: (
    request: typeof CloudflareSchema.ExtractionsRequest.Encoded
  ) => Effect.Effect<typeof CloudflareSchema.ExtractionsResponse.Type, AiError.AiError>
}

/**
 * Cloudflare Workers AI client service.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class CloudflareClient
  extends Context.Service<CloudflareClient, Service>()("@effect/ai-cloudflare/CloudflareClient")
{}

/**
 * Account, authentication, AI Gateway, API base URL, and HTTP customization options.
 *
 * @stability unstable
 * @category options
 * @since 4.0.0
 */
export interface Options {
  readonly accountId: string
  readonly apiKey: Redacted.Redacted<string>
  readonly gatewayId?: string | undefined
  readonly apiUrl?: string | undefined
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}

const decodeResponse = <S extends Schema.Top & { readonly DecodingServices: never }>(result: S) =>
  HttpClientResponse.schemaBodyJson(Schema.Union([
    Schema.Struct({ success: Schema.Literal(true), result }),
    Schema.Struct({ success: Schema.Literal(false) })
  ]))

/**
 * Builds a Cloudflare client without automatic retries.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(options: Options): Effect.fn.Return<Service, never, HttpClient.HttpClient> {
    const base = yield* HttpClient.HttpClient
    const client = base.pipe(
      HttpClient.mapRequest(flow(
        HttpClientRequest.prependUrl(options.apiUrl ?? "https://api.cloudflare.com/client/v4"),
        HttpClientRequest.bearerToken(Redacted.value(options.apiKey)),
        HttpClientRequest.acceptJson,
        options.gatewayId === undefined
          ? identity
          : HttpClientRequest.setHeader("cf-aig-gateway-id", options.gatewayId)
      )),
      HttpClient.filterStatusOk,
      options.transformClient ?? identity
    )
    const path = `/accounts/${encodeURIComponent(options.accountId)}/ai/run/@cf/cloudflare/`
    const run = <A>(
      method: Errors.Method,
      decode: (
        response: HttpClientResponse.HttpClientResponse
      ) => Effect.Effect<
        { readonly success: true; readonly result: A } | { readonly success: false },
        Schema.SchemaError | HttpClientError.HttpClientError
      >
    ) =>
    (payload: { readonly model: string }): Effect.Effect<A, AiError.AiError> =>
      HttpClientRequest.bodyJson(HttpClientRequest.post(path + payload.model), payload).pipe(
        Effect.mapError((error) =>
          AiError.make({
            module: "CloudflareClient",
            method,
            reason: new AiError.InvalidRequestError({ description: String(error) })
          })
        ),
        Effect.flatMap(client.execute),
        Effect.flatMap((response) =>
          decode(response).pipe(
            Effect.flatMap((body) =>
              body.success ? Effect.succeed(body.result) : Errors.mapResponseError(method, response)
            )
          )
        ),
        Effect.catchTags({
          HttpClientError: (error) => Errors.mapHttpClientError(method, error),
          SchemaError: (error) =>
            Effect.fail(AiError.make({
              module: "CloudflareClient",
              method,
              reason: AiError.InvalidResponseError.fromSchemaError(error)
            }))
        })
      )
    return CloudflareClient.of({
      client,
      createDecisions: run("createDecisions", decodeResponse(CloudflareSchema.DecisionsResponse)),
      createExtractions: run("createExtractions", decodeResponse(CloudflareSchema.ExtractionsResponse))
    })
  }
)

/**
 * Provides a Cloudflare client from explicit options.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: Options): Layer.Layer<CloudflareClient, never, HttpClient.HttpClient> =>
  Layer.effect(CloudflareClient, make(options))

/**
 * Provides a client from configuration. It reads `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and the optional
 * `CLOUDFLARE_AI_GATEWAY_ID` by default.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (options?: {
  readonly accountId?: Config.Config<string> | undefined
  readonly apiKey?: Config.Config<Redacted.Redacted<string>> | undefined
  readonly gatewayId?: Config.Config<string> | undefined
  readonly apiUrl?: Config.Config<string> | undefined
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Layer.Layer<CloudflareClient, Config.ConfigError, HttpClient.HttpClient> =>
  Layer.effect(
    CloudflareClient,
    Effect.gen(function*() {
      return yield* make({
        accountId: yield* (options?.accountId ?? Config.String("CLOUDFLARE_ACCOUNT_ID")),
        apiKey: yield* (options?.apiKey ?? Config.Redacted("CLOUDFLARE_API_TOKEN")),
        gatewayId: yield* (options?.gatewayId ??
          Config.String("CLOUDFLARE_AI_GATEWAY_ID").pipe(Config.withDefault(undefined))),
        apiUrl: options?.apiUrl ? yield* options.apiUrl : undefined,
        transformClient: options?.transformClient
      })
    })
  )
