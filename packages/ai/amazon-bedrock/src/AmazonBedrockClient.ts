/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import * as Headers from "@effect/platform/Headers"
import * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import { AwsV4Signer } from "aws4fetch"
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import type { ParseError } from "effect/ParseResult"
import * as Redacted from "effect/Redacted"
import type * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { AmazonBedrockConfig } from "./AmazonBedrockConfig.js"
import type { ConverseRequest } from "./AmazonBedrockSchema.js"
import { ConverseResponse, ConverseResponseStreamEvent } from "./AmazonBedrockSchema.js"
import * as EventStreamEncoding from "./EventStreamEncoding.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class AmazonBedrockClient extends Context.Tag(
  "@effect/ai-amazon-bedrock/AmazonBedrockClient"
)<AmazonBedrockClient, Service>() {}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  readonly client: Client

  readonly streamRequest: <A, I, R>(
    request: HttpClientRequest.HttpClientRequest,
    schema: Schema.Schema<A, I, R>
  ) => Stream.Stream<A, AiError.AiError, R>

  readonly converse: (options: {
    readonly params?: { "anthropic-beta"?: string | undefined } | undefined
    readonly payload: typeof ConverseRequest.Encoded
  }) => Effect.Effect<ConverseResponse, AiError.AiError>

  readonly converseStream: (options: {
    readonly params?: { "anthropic-beta"?: string | undefined } | undefined
    readonly payload: typeof ConverseRequest.Encoded
  }) => Stream.Stream<ConverseResponseStreamEvent, AiError.AiError>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  readonly apiUrl?: string | undefined
  readonly accessKeyId: string
  readonly secretAccessKey: Redacted.Redacted<string>
  readonly sessionToken?: Redacted.Redacted<string> | undefined
  readonly region?: string | undefined
  readonly transformClient?: (
    client: HttpClient.HttpClient
  ) => HttpClient.HttpClient
}) =>
  Effect.gen(function*() {
    const region = options.region ?? "us-east-1"

    const redactedHeaders = ["X-Amz-Security-Token"]

    yield* Effect.locallyScopedWith(Headers.currentRedactedNames, Arr.appendAll(redactedHeaders))

    const httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.prependUrl(options.apiUrl ?? `https://bedrock-runtime.${region}.amazonaws.com`),
          HttpClientRequest.acceptJson
        )
      ),
      HttpClient.mapRequestEffect(Effect.fnUntraced(function*(request) {
        const originalHeaders = request.headers
        const signer = new AwsV4Signer({
          service: "bedrock",
          url: request.url,
          method: request.method,
          headers: Object.entries(originalHeaders),
          body: prepareBody(request.body),
          region,
          accessKeyId: options.accessKeyId,
          secretAccessKey: Redacted.value(options.secretAccessKey),
          ...(options.sessionToken ? { sessionToken: Redacted.value(options.sessionToken) } : {})
        })
        const { headers: signedHeaders } = yield* Effect.promise(() => signer.sign())
        const headers = Headers.merge(originalHeaders, Headers.fromInput(signedHeaders))
        return HttpClientRequest.setHeaders(request, headers)
      })),
      options.transformClient ? options.transformClient : identity
    )

    const httpClientOk = HttpClient.filterStatusOk(httpClient)

    const client = makeClient(httpClient, {
      transformClient: (client) =>
        AmazonBedrockConfig.getOrUndefined.pipe(
          Effect.map((config) => config?.transformClient ? config.transformClient(client) : client)
        )
    })

    const converse: (options: {
      readonly params?: { "anthropic-beta"?: string | undefined } | undefined
      readonly payload: typeof ConverseRequest.Encoded
    }) => Effect.Effect<ConverseResponse, AiError.AiError> = Effect.fnUntraced(
      function*(request) {
        return yield* client.converse(request).pipe(
          Effect.catchTags({
            RequestError: (error) =>
              AiError.HttpRequestError.fromRequestError({
                module: "AmazonBedrockClient",
                method: "converse",
                error
              }),
            ResponseError: (error) =>
              AiError.HttpResponseError.fromResponseError({
                module: "AmazonBedrockClient",
                method: "converse",
                error
              }),
            ParseError: (error) =>
              AiError.MalformedOutput.fromParseError({
                module: "AmazonBedrockClient",
                method: "converse",
                error
              })
          })
        )
      }
    )

    const streamRequest = <A, I, R>(
      request: HttpClientRequest.HttpClientRequest,
      schema: Schema.Schema<A, I, R>
    ): Stream.Stream<A, AiError.AiError, R> =>
      httpClientOk.execute(request).pipe(
        Effect.map((r) => r.stream),
        Stream.unwrapScoped,
        Stream.pipeThroughChannel(EventStreamEncoding.makeChannel(schema)),
        Stream.catchTags({
          RequestError: (error) =>
            AiError.HttpRequestError.fromRequestError({
              module: "AmazonBedrockClient",
              method: "streamRequest",
              error
            }),
          ResponseError: (error) =>
            AiError.HttpResponseError.fromResponseError({
              module: "AmazonBedrockClient",
              method: "streamRequest",
              error
            }),
          ParseError: (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "AmazonBedrockClient",
              method: "streamRequest",
              error
            })
        })
      )

    const converseStream = (options: {
      readonly params?: { "anthropic-beta"?: string | undefined } | undefined
      readonly payload: typeof ConverseRequest.Encoded
    }): Stream.Stream<ConverseResponseStreamEvent, AiError.AiError> => {
      const { modelId, ...body } = options.payload
      const request = HttpClientRequest.post(`/model/${modelId}/converse-stream`, {
        headers: Headers.fromInput({
          "anthropic-beta": options.params?.["anthropic-beta"]
        }),
        body: HttpBody.unsafeJson(body)
      })
      return streamRequest(request, ConverseResponseStreamEvent)
    }

    return AmazonBedrockClient.of({
      client,
      streamRequest,
      converse,
      converseStream
    })
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options: {
  readonly apiUrl?: string | undefined
  readonly accessKeyId: string
  readonly secretAccessKey: Redacted.Redacted<string>
  readonly sessionToken?: Redacted.Redacted<string> | undefined
  readonly region?: string | undefined
  readonly transformClient?: (
    client: HttpClient.HttpClient
  ) => HttpClient.HttpClient
}): Layer.Layer<AmazonBedrockClient, never, HttpClient.HttpClient> => Layer.scoped(AmazonBedrockClient, make(options))

/**
 * @since 1.0.0
 * @category layers
 */
export const layerConfig = (
  options: {
    readonly apiUrl?: Config.Config<string> | undefined
    readonly accessKeyId: Config.Config<string>
    readonly secretAccessKey: Config.Config<Redacted.Redacted>
    readonly sessionToken?: Config.Config<Redacted.Redacted> | undefined
    readonly region?: Config.Config<string> | undefined
    readonly transformClient?: (
      client: HttpClient.HttpClient
    ) => HttpClient.HttpClient
  }
): Layer.Layer<AmazonBedrockClient, ConfigError, HttpClient.HttpClient> => {
  const { transformClient, ...configs } = options
  return Config.all(configs).pipe(
    Effect.flatMap((configs) => make({ ...configs, transformClient })),
    Layer.scoped(AmazonBedrockClient)
  )
}

// =============================================================================
// Client
// =============================================================================

/**
 * @since 1.0.0
 * @category models
 */
export interface Client {
  readonly converse: (options: {
    readonly params?: { "anthropic-beta"?: string | undefined }
    readonly payload: typeof ConverseRequest.Encoded
  }) => Effect.Effect<typeof ConverseResponse.Type, HttpClientError.HttpClientError | ParseError>
}

const makeClient = (
  httpClient: HttpClient.HttpClient,
  options: {
    readonly transformClient?: ((client: HttpClient.HttpClient) => Effect.Effect<HttpClient.HttpClient>) | undefined
  }
): Client => {
  const unexpectedStatus = (response: HttpClientResponse.HttpClientResponse) =>
    Effect.flatMap(
      Effect.orElseSucceed(response.json, () => "Unexpected status code"),
      (description) =>
        Effect.fail(
          new HttpClientError.ResponseError({
            request: response.request,
            response,
            reason: "StatusCode",
            description: typeof description === "string" ? description : JSON.stringify(description)
          })
        )
    )
  const withResponse: <A, E>(
    f: (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<A, E>
  ) => (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<any, any> = options.transformClient
    ? (f) => (request) =>
      Effect.flatMap(
        Effect.flatMap(options.transformClient!(httpClient), (client) => client.execute(request)),
        f
      )
    : (f) => (request) => Effect.flatMap(httpClient.execute(request), f)
  const decodeSuccess =
    <A, I, R>(schema: Schema.Schema<A, I, R>) => (response: HttpClientResponse.HttpClientResponse) =>
      HttpClientResponse.schemaBodyJson(schema)(response)
  return {
    converse: ({ params, payload: { modelId, ...payload } }) =>
      HttpClientRequest.post(`/model/${modelId}/converse`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": params?.["anthropic-beta"] ?? undefined
        }),
        HttpClientRequest.bodyUnsafeJson(payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ConverseResponse),
          orElse: unexpectedStatus
        }))
      )
  }
}

const prepareBody = (body: HttpBody.HttpBody): string => {
  switch (body._tag) {
    case "Raw":
    case "Uint8Array": {
      if (typeof body.body === "string") {
        return body.body
      }
      if (body.body instanceof Uint8Array) {
        return new TextDecoder().decode(body.body)
      }
      if (body.body instanceof ArrayBuffer) {
        return new TextDecoder().decode(body.body)
      }
      return JSON.stringify(body.body)
    }
  }
  throw new Error("Unsupported HttpBody: " + body._tag)
}
