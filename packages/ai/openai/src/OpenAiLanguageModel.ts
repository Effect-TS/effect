/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import type * as AiInput from "@effect/ai/AiInput"
import * as AiLanguageModel from "@effect/ai/AiLanguageModel"
import * as AiModel from "@effect/ai/AiModel"
import * as AiResponse from "@effect/ai/AiResponse"
import * as Tokenizer from "@effect/ai/Tokenizer"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import { resolveFinishReason } from "./internal/utilities.js"
import { OpenAiClient } from "./OpenAiClient.js"
import { addGenAIAnnotations } from "./OpenAiTelemetry.js"
import * as OpenAiTokenizer from "./OpenAiTokenizer.js"

const constDisableValidation = { disableValidation: true } as const

/**
 * @since 1.0.0
 * @category Models
 */
export type Model = typeof Generated.ModelIdsSharedEnum.Encoded

// =============================================================================
// Configuration
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class Config extends Context.Tag("@effect/ai-openai/OpenAiLanguageModel/Config")<
  Config,
  Config.Service
>() {
  /**
   * @since 1.0.0
   */
  static readonly getOrUndefined: Effect.Effect<Config.Service | undefined> = Effect.map(
    Effect.context<never>(),
    (context) => context.unsafeMap.get(Config.key)
  )
}

/**
 * @since 1.0.0
 */
export declare namespace Config {
  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Service extends
    Simplify<
      Partial<
        Omit<
          typeof Generated.CreateChatCompletionRequest.Encoded,
          "messages" | "tools" | "tool_choice" | "stream" | "stream_options" | "functions"
        >
      >
    >
  {}
}

// =============================================================================
// OpenAi Completions
// =============================================================================

const modelCacheKey = Symbol.for("@effect/ai-openai/OpenAiLanguageModel/AiModel")

/**
 * @since 1.0.0
 * @category AI Models
 */
export const model = (
  model: (string & {}) | Model,
  config?: Omit<Config.Service, "model">
): AiModel.AiModel<AiLanguageModel.AiLanguageModel | Tokenizer.Tokenizer, OpenAiClient> =>
  AiModel.make({
    model,
    cacheKey: modelCacheKey,
    requires: OpenAiClient,
    provides: Effect.map(
      make({ model, config }),
      (completions) => Context.make(AiLanguageModel.AiLanguageModel, completions)
    ) as Effect.Effect<Context.Context<AiLanguageModel.AiLanguageModel | Tokenizer.Tokenizer>>,
    updateContext: (context) => {
      const innerConfig = context.unsafeMap.get(Config.key) as Config.Service | undefined
      return Context.mergeAll(
        context,
        Context.make(Config, { model, ...config, ...innerConfig }),
        Context.make(Tokenizer.Tokenizer, OpenAiTokenizer.make({ model: innerConfig?.model ?? model }))
      )
    }
  })

const make = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}) {
  const client = yield* OpenAiClient

  const makeRequest = Effect.fnUntraced(
    function*(method: string, { prompt, required, system, tools }: AiLanguageModel.AiLanguageModelOptions) {
      const useStructured = tools.length === 1 && tools[0].structured
      let toolChoice: typeof Generated.ChatCompletionToolChoiceOption.Encoded | undefined = undefined
      if (Predicate.isNotUndefined(required)) {
        if (Predicate.isBoolean(required)) {
          toolChoice = required ? "required" : "auto"
        } else {
          toolChoice = { type: "function", function: { name: required } }
        }
      }
      const context = yield* Effect.context<never>()
      const messages = yield* makeMessages(method, system, prompt)
      return {
        model: options.model,
        ...options.config,
        ...context.unsafeMap.get(Config.key),
        messages,
        response_format: useStructured ?
          {
            type: "json_schema",
            json_schema: {
              strict: true,
              name: tools[0].name,
              description: tools[0].description,
              schema: tools[0].parameters as any
            }
          } :
          undefined,
        tools: !useStructured && tools.length > 0 ?
          tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters as any,
              strict: true
            }
          })) :
          undefined,
        tool_choice: !useStructured && tools.length > 0 ? toolChoice : undefined
      } satisfies typeof Generated.CreateChatCompletionRequest.Encoded
    }
  )

  return AiLanguageModel.make({
    generateText(options) {
      const method = "generateText"
      return makeRequest(method, options).pipe(
        Effect.tap((request) => annotateRequest(options.span, request)),
        Effect.flatMap(client.client.createChatCompletion),
        Effect.tap((response) => annotateChatResponse(options.span, response)),
        Effect.flatMap((response) => makeResponse(response, method)),
        Effect.catchAll((cause) =>
          Effect.fail(
            new AiError({
              module: "OpenAiLanguageModel",
              method,
              description: "An error occurred",
              cause
            })
          )
        )
      )
    },
    streamText(options) {
      const method = "streamText"
      return makeRequest(method, options).pipe(
        Effect.tap((request) => annotateRequest(options.span, request)),
        Effect.map(client.stream),
        Stream.unwrap,
        Stream.tap((response) => {
          annotateStreamResponse(options.span, response)
          return Effect.void
        }),
        Stream.catchAll((cause) =>
          Effect.fail(
            new AiError({
              module: "OpenAiLanguageModel",
              method,
              description: "An error occurred",
              cause
            })
          )
        )
      )
    }
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerCompletions = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<AiLanguageModel.AiLanguageModel, never, OpenAiClient> =>
  Layer.effect(
    AiLanguageModel.AiLanguageModel,
    make({ model: options.model, config: options.config })
  )

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<AiLanguageModel.AiLanguageModel | Tokenizer.Tokenizer, never, OpenAiClient> =>
  Layer.merge(layerCompletions(options), OpenAiTokenizer.layer(options))

/**
 * @since 1.0.0
 * @category Configuration
 */
export const withConfigOverride: {
  (overrides: Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: Config.Service): Effect.Effect<A, E, R>
} = dual<
  (overrides: Config.Service) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: Config.Service) => Effect.Effect<A, E, R>
>(2, (self, overrides) =>
  Effect.flatMap(
    Config.getOrUndefined,
    (config) => Effect.provideService(self, Config, { ...config, ...overrides })
  ))

const makeMessages = Effect.fnUntraced(function*(
  method: string,
  system: Option.Option<string>,
  prompt: AiInput.AiInput
) {
  type Messages = Array<typeof Generated.ChatCompletionRequestMessage.Encoded>
  type UserPart = typeof Generated.ChatCompletionRequestUserMessageContentPart.Encoded
  const messages: Messages = Option.match(system, {
    onNone: () => [],
    onSome: (content) => [{ role: "system", content }]
  })
  for (const message of prompt) {
    switch (message.role) {
      case "assistant": {
        let text = ""
        const toolCalls: Array<typeof Generated.ChatCompletionMessageToolCall.Encoded> = []
        for (const part of message.parts) {
          switch (part._tag) {
            case "Text": {
              text += part.content
              break
            }
            case "ToolCall": {
              toolCalls.push({
                id: part.id,
                type: "function",
                function: {
                  name: part.name,
                  arguments: JSON.stringify(part.params)
                }
              })
              break
            }
          }
        }
        messages.push({
          role: "assistant",
          content: text,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined
        })

        break
      }
      case "tool": {
        for (const part of message.parts) {
          messages.push({
            role: "tool",
            tool_call_id: part.id,
            content: JSON.stringify(part.result)
          })
        }
        break
      }
      case "user": {
        // Handle the case where the message content is just a single piece of text
        if (message.parts.length === 1 && message.parts[0]._tag === "Text") {
          messages.push({ role: "user", content: message.parts[0].content })
          break
        }
        const content: Array<UserPart> = []
        for (let index = 0; index < message.parts.length; index++) {
          const part = message.parts[index]
          switch (part._tag) {
            case "File": {
              if (part.fileContent instanceof URL) {
                return yield* new AiError({
                  module: "OpenAiLanguageModel",
                  method,
                  description: "OpenAi does not support file content parts with URL data"
                })
              }
              switch (part.mediaType) {
                case "audio/wav": {
                  content.push({
                    type: "input_audio",
                    input_audio: { data: part.fileContent, format: "wav" }
                  })
                  break
                }
                case "audio/mp3":
                case "audio/mpeg": {
                  content.push({
                    type: "input_audio",
                    input_audio: { data: part.fileContent, format: "mp3" }
                  })
                  break
                }
                case "application/pdf": {
                  content.push({
                    type: "file",
                    file: {
                      filename: part.fileName ?? `part-${index}.pdf`,
                      file_data: `data:application/pdf;base64,${part.fileContent}`
                    }
                  })
                  break
                }
              }
              return yield* new AiError({
                module: "OpenAiLanguageModel",
                method: "",
                description: `OpenAi does not support file inputs of type "${part.mediaType}"`
              })
            }
            case "Text": {
              content.push({ type: "text", text: part.content })
              break
            }
            case "Image": {
              const url = part.url instanceof URL
                ? part.url.toString()
                : `data:${part.mediaType ?? "image/jpeg"};base64,${Encoding.encodeBase64(part.url)}`
              const detail = part.providerOptions?.openai?.imageDetail as any
              content.push({ type: "image_url", image_url: { url, detail } })
              break
            }
          }
        }
        if (Arr.isNonEmptyArray(content)) {
          messages.push({
            role: message.role,
            name: message.userName,
            content
          })
        }
        break
      }
    }
  }
  if (Arr.isNonEmptyReadonlyArray(messages)) {
    return messages
  }
  return yield* new AiError({
    module: "OpenAiLanguageModel",
    method,
    description: "Prompt contained no messages"
  })
})

const makeResponse = Effect.fnUntraced(function*(
  response: typeof Generated.CreateChatCompletionResponse.Type,
  method: string
) {
  const choice = response.choices[0]
  if (Predicate.isUndefined(choice)) {
    return yield* new AiError({
      module: "OpenAiLanguageModel",
      method,
      description: "Could not get response"
    })
  }
  const parts: Array<AiResponse.Part> = []
  parts.push(
    new AiResponse.ResponseMetadataPart({
      id: response.id,
      model: response.model,
      // OpenAi returns the `created` time in seconds
      timestamp: new Date(response.created * 1000)
    }, constDisableValidation)
  )
  const finishReason = resolveFinishReason(choice.finish_reason)
  const inputTokens = response.usage?.prompt_tokens ?? 0
  const outputTokens = response.usage?.completion_tokens ?? 0
  const totalTokens = inputTokens + outputTokens
  const metadata: Record<string, unknown> = {}
  if (Predicate.isNotUndefined(response.service_tier)) {
    metadata.serviceTier = response.service_tier
  }
  if (Predicate.isNotUndefined(response.system_fingerprint)) {
    metadata.systemFingerprint = response.system_fingerprint
  }
  if (Predicate.isNotUndefined(response.usage?.completion_tokens_details?.accepted_prediction_tokens)) {
    metadata.acceptedPredictionTokens = response.usage?.completion_tokens_details?.accepted_prediction_tokens
  }
  if (Predicate.isNotUndefined(response.usage?.completion_tokens_details?.rejected_prediction_tokens)) {
    metadata.rejectedPredictionTokens = response.usage?.completion_tokens_details?.rejected_prediction_tokens
  }
  if (Predicate.isNotUndefined(response.usage?.prompt_tokens_details?.audio_tokens)) {
    metadata.inputAudioTokens = response.usage?.prompt_tokens_details?.audio_tokens
  }
  if (Predicate.isNotUndefined(response.usage?.completion_tokens_details?.audio_tokens)) {
    metadata.outputAudioTokens = response.usage?.completion_tokens_details?.audio_tokens
  }
  parts.push(
    new AiResponse.FinishPart({
      reason: finishReason,
      usage: new AiResponse.Usage({
        inputTokens,
        outputTokens,
        totalTokens,
        reasoningTokens: response.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
        cacheReadInputTokens: response.usage?.prompt_tokens_details?.cached_tokens ?? 0,
        cacheWriteInputTokens: 0
      }, constDisableValidation),
      providerMetadata: {
        openai: metadata
      }
    }, constDisableValidation)
  )
  const res = typeof choice.message.content === "string"
    ? AiResponse.AiResponse.fromText(choice.message.content)
    : AiResponse.AiResponse.empty
  if (
    Predicate.isNotUndefined(choice.message.tool_calls) &&
    choice.message.tool_calls.length > 0
  ) {
    return yield* res.withToolCallsJson(
      choice.message.tool_calls.map((tool) => ({
        id: tool.id,
        name: tool.function.name,
        params: tool.function.arguments
      }))
    )
  }
  return res
})

const annotateRequest = (
  span: Span,
  request: typeof Generated.CreateChatCompletionRequest.Encoded
): void => {
  addGenAIAnnotations(span, {
    system: "openai",
    operation: { name: "chat" },
    request: {
      model: request.model,
      temperature: request.temperature,
      topP: request.top_p,
      maxTokens: request.max_tokens,
      stopSequences: Arr.ensure(request.stop).filter(Predicate.isNotNullable),
      frequencyPenalty: request.frequency_penalty,
      presencePenalty: request.presence_penalty,
      seed: request.seed
    },
    openai: {
      request: {
        responseFormat: request.response_format?.type,
        serviceTier: request.service_tier
      }
    }
  })
}

const annotateChatResponse = (
  span: Span,
  response: typeof Generated.CreateChatCompletionResponse.Type
): void => {
  addGenAIAnnotations(span, {
    response: {
      id: response.id,
      model: response.model,
      finishReasons: response.choices.map((choice) => choice.finish_reason)
    },
    usage: {
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens
    },
    openai: {
      response: {
        systemFingerprint: response.system_fingerprint,
        serviceTier: response.service_tier
      }
    }
  })
}

const annotateStreamResponse = (
  span: Span,
  response: AiResponse.AiResponse
) => {
  const responseMetadataPart = response.parts.find((part) => part._tag === "ResponseMetadata")
  const finishPart = response.parts.find((part) => part._tag === "Finish")
  addGenAIAnnotations(span, {
    response: {
      id: responseMetadataPart?.id,
      model: responseMetadataPart?.model,
      finishReasons: finishPart?.reason ? [finishPart.reason] : undefined
    },
    usage: {
      inputTokens: finishPart?.usage.inputTokens,
      outputTokens: finishPart?.usage.outputTokens
    },
    openai: {
      response: {
        serviceTier: finishPart?.providerMetadata?.openai?.serviceTier as any,
        systemFingerprint: finishPart?.providerMetadata?.openai?.systemFingerprint as any
      }
    }
  })
}
