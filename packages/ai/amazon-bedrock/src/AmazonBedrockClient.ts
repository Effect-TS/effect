/**
 * @since 1.0.0
 */
import * as AiInput from "@effect/ai/AiInput"
import * as AiResponse from "@effect/ai/AiResponse"
import * as Headers from "@effect/platform/Headers"
import type * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import { AwsV4Signer } from "aws4fetch"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type { ParseError } from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Stream from "effect/Stream"
import type { Mutable } from "effect/Types"
import type { ProviderMetadata } from "./AmazonBedrockLanguageModel.js"
import type { ConverseRequest } from "./AmazonBedrockSchema.js"
import { ConverseResponse, ConverseStreamResponse } from "./AmazonBedrockSchema.js"
import * as EventStreamEncoding from "./EventStreamEncoding.js"
import * as InternalUtilities from "./internal/utilities.js"

const constDisableValidation = { disableValidation: true } as const

/**
 * @since 1.0.0
 * @category tags
 */
export class AmazonBedrockClient extends Context.Tag(
  "@effect/ai-amazon-bedrock/AmazonBedrockClient"
)<AmazonBedrockClient, AmazonBedrockClient.Service>() {}

/**
 * @since 1.0.0
 */
export declare namespace AmazonBedrockClient {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Service {
    readonly client: Client
    readonly streamRequest: (request: typeof ConverseRequest.Encoded) => Stream.Stream<
      ConverseStreamResponse,
      HttpClientError.HttpClientError | ParseError
    >
    readonly stream: (request: typeof ConverseRequest.Encoded) => Stream.Stream<
      AiResponse.AiResponse,
      HttpClientError.HttpClientError | ParseError
    >
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Client {
    readonly converse: (
      options: typeof ConverseRequest.Encoded
    ) => Effect.Effect<typeof ConverseResponse.Type, HttpClientError.HttpClientError | ParseError>
    readonly converseStream: (
      options: typeof ConverseRequest.Encoded
    ) => Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError | ParseError>
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: {
  readonly apiUrl?: string | undefined
  readonly accessKeyId: Redacted.Redacted
  readonly secretAccessKey: Redacted.Redacted
  readonly sessionToken?: Redacted.Redacted | undefined
  readonly region?: string | undefined
  readonly transformClient?: (
    client: HttpClient.HttpClient
  ) => HttpClient.HttpClient
}) =>
  Effect.gen(function*() {
    const region = options.region ?? "us-east-1"

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
          accessKeyId: Redacted.value(options.accessKeyId),
          secretAccessKey: Redacted.value(options.secretAccessKey),
          ...(options.sessionToken ? { sessionToken: Redacted.value(options.sessionToken) } : {})
        })
        const { headers: signedHeaders } = yield* Effect.promise(() => signer.sign())
        const headers = Headers.merge(originalHeaders, Headers.fromInput(signedHeaders))
        return HttpClientRequest.setHeaders(request, headers)
      })),
      options.transformClient ? options.transformClient : identity
    )

    const httpClientOk = httpClient

    const client = makeClient(httpClientOk, {
      transformClient: (client) => Effect.succeed(client)
      // TODO
      // AnthropicConfig.getOrUndefined.pipe(
      //   Effect.map((config) => config?.transformClient ? config.transformClient(client) : client)
      // )
    })

    const streamRequest = (request: typeof ConverseRequest.Encoded) =>
      client.converseStream(request).pipe(
        Effect.map((response) => response.stream),
        Stream.unwrap,
        Stream.pipeThroughChannel(EventStreamEncoding.makeChannel(ConverseStreamResponse))
      )

    const stream = (request: typeof ConverseRequest.Encoded) =>
      Stream.suspend(() => {
        const toolCalls = {} as Record<number, RawToolCall>
        let reasoningText: string | undefined = undefined
        let usage: AiResponse.Usage = {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          reasoningTokens: 0,
          cacheReadInputTokens: 0,
          cacheWriteInputTokens: 0
        }
        const metadata: Mutable<ProviderMetadata.Service> = {} as any
        return streamRequest(request).pipe(
          Stream.filterMap((response) => {
            const parts: Array<AiResponse.Part> = []

            if (Predicate.isNotUndefined(response.metadata)) {
              usage = {
                inputTokens: response.metadata.usage.inputTokens,
                outputTokens: response.metadata.usage.outputTokens,
                totalTokens: response.metadata.usage.totalTokens,
                reasoningTokens: 0,
                cacheReadInputTokens: response.metadata.usage.cacheReadInputTokens ?? 0,
                cacheWriteInputTokens: response.metadata.usage.cacheWriteInputTokens ?? 0
              }
              metadata.metrics = response.metadata.metrics
              if (Predicate.isNotUndefined(response.metadata.trace)) {
                metadata.trace = response.metadata.trace
              }
              if (Predicate.isNotUndefined(response.metadata.performanceConfig)) {
                metadata.performanceConfig = response.metadata.performanceConfig
              }
            }

            if (Predicate.isNotUndefined(response.messageStart)) {
              parts.push(
                new AiResponse.MetadataPart({
                  model: request.modelId
                }, constDisableValidation)
              )
            }

            if (Predicate.isNotUndefined(response.contentBlockStart)) {
              const index = response.contentBlockStart.contentBlockIndex
              const toolUse = response.contentBlockStart.start.toolUse
              toolCalls[index] = {
                id: toolUse.toolUseId,
                name: toolUse.name,
                params: ""
              }
            }

            if (Predicate.isNotUndefined(response.contentBlockDelta)) {
              const delta = response.contentBlockDelta.delta

              if ("text" in delta) {
                parts.push(
                  new AiResponse.TextPart({
                    text: delta.text
                  }, constDisableValidation)
                )
              }

              if ("reasoningContent" in delta) {
                if ("text" in delta.reasoningContent) {
                  reasoningText = delta.reasoningContent.text
                }
                if ("signature" in delta.reasoningContent) {
                  if (Predicate.isNotUndefined(reasoningText)) {
                    parts.push(
                      new AiResponse.ReasoningPart({
                        reasoningText,
                        signature: delta.reasoningContent.signature
                      }, constDisableValidation)
                    )
                  } else {
                    throw new Error(
                      "[BUG]: AmazonBedrockClient.stream - no reasoning text found for signature: ${delta.reasoningContent.signature} - please report an issue at https://github.com/Effect-TS/effect/issues"
                    )
                  }
                }
                if ("redactedContent" in delta.reasoningContent) {
                  const decoder = new TextDecoder()
                  parts.push(
                    new AiResponse.RedactedReasoningPart({
                      redactedText: decoder.decode(delta.reasoningContent.redactedContent)
                    }, constDisableValidation)
                  )
                }
              }

              if ("toolUse" in delta) {
                const index = response.contentBlockDelta.contentBlockIndex
                const tool = toolCalls[index]
                const toolDelta = delta.toolUse.input
                if (Predicate.isNotUndefined(tool)) {
                  tool.params += toolDelta
                }
              }
            }

            if (Predicate.isNotUndefined(response.contentBlockStop)) {
              const index = response.contentBlockStop.contentBlockIndex
              const tool = toolCalls[index]
              if (Predicate.isNotUndefined(tool)) {
                try {
                  const params = JSON.parse(tool.params)
                  parts.push(
                    new AiResponse.ToolCallPart({
                      id: AiInput.ToolCallId.make(tool.id, constDisableValidation),
                      name: tool.name,
                      params
                    }, constDisableValidation)
                  )
                  delete toolCalls[index]
                  // eslint-disable-next-line no-empty
                } catch {}
              }
            }

            if (Predicate.isNotUndefined(response.messageStop)) {
              parts.push(
                new AiResponse.FinishPart({
                  usage,
                  reason: InternalUtilities.resolveFinishReason(response.messageStop.stopReason),
                  providerMetadata: { [InternalUtilities.ProviderMetadataKey]: metadata }
                }, constDisableValidation)
              )
            }

            return parts.length === 0
              ? Option.none()
              : Option.some(AiResponse.AiResponse.make({ parts }, constDisableValidation))
          })
        )
      })

    return AmazonBedrockClient.of({ client, stream, streamRequest })
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options: {
  readonly apiUrl?: string | undefined
  readonly accessKeyId: Redacted.Redacted
  readonly secretAccessKey: Redacted.Redacted
  readonly sessionToken?: Redacted.Redacted | undefined
  readonly region?: string | undefined
  readonly transformClient?: (
    client: HttpClient.HttpClient
  ) => HttpClient.HttpClient
}): Layer.Layer<AmazonBedrockClient, never, HttpClient.HttpClient> => Layer.effect(AmazonBedrockClient, make(options))

/**
 * @since 1.0.0
 * @category layers
 */
export const layerConfig = (
  options: Config.Config.Wrap<{
    readonly apiUrl?: string | undefined
    readonly accessKeyId: Redacted.Redacted
    readonly secretAccessKey: Redacted.Redacted
    readonly sessionToken?: Redacted.Redacted | undefined
    readonly region?: string | undefined
    readonly transformClient?: (
      client: HttpClient.HttpClient
    ) => HttpClient.HttpClient
  }>
): Layer.Layer<AmazonBedrockClient, ConfigError, HttpClient.HttpClient> =>
  Config.unwrap(options).pipe(
    Effect.flatMap(make),
    Layer.effect(AmazonBedrockClient)
  )

const makeClient = (
  httpClient: HttpClient.HttpClient,
  options: {
    readonly transformClient?: ((client: HttpClient.HttpClient) => Effect.Effect<HttpClient.HttpClient>) | undefined
  }
): AmazonBedrockClient.Client => {
  const unexpectedStatus = (
    request: HttpClientRequest.HttpClientRequest,
    response: HttpClientResponse.HttpClientResponse
  ) =>
    Effect.flatMap(
      Effect.orElseSucceed(response.text, () => "Unexpected status code"),
      (description) =>
        Effect.fail(
          new HttpClientError.ResponseError({
            request,
            response,
            reason: "StatusCode",
            description
          })
        )
    )
  const applyClientTransform = (client: HttpClient.HttpClient): Effect.Effect<HttpClient.HttpClient> =>
    options.transformClient ? options.transformClient(client) : Effect.succeed(client)
  return {
    converse: ({ modelId, ...payload }) =>
      HttpClientRequest.make("POST")(`/model/${modelId}/converse`).pipe(
        (request) => Effect.orDie(HttpClientRequest.bodyJson(request, payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (response) => HttpClientResponse.schemaBodyJson(ConverseResponse)(response),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    converseStream: ({ modelId, ...payload }) =>
      HttpClientRequest.make("POST")(`/model/${modelId}/converse-stream`).pipe(
        (request) => Effect.orDie(HttpClientRequest.bodyJson(request, payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.filterStatusOk
            ))
        )
      )
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export class StreamChunk extends Data.Class<{
  readonly parts: Array<StreamChunkPart>
}> {}

/**
 * @since 1.0.0
 * @category models
 */
export type StreamChunkPart = any /* ContentPart | ToolCallPart | UsagePart */

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

type RawToolCall = {
  readonly id: string
  readonly name: string
  params: string
}
