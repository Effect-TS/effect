/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import type * as AiInput from "@effect/ai/AiInput"
import * as AiResponse from "@effect/ai/AiResponse"
import * as AiRole from "@effect/ai/AiRole"
import * as Completions from "@effect/ai/Completions"
import type * as Tokenizer from "@effect/ai/Tokenizer"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import type * as Generated from "./Generated.js"
import { OpenAiClient } from "./OpenAiClient.js"
import { OpenAiConfig } from "./OpenAiConfig.js"
import * as OpenAiTokenizer from "./OpenAiTokenizer.js"

const make = (options: {
  readonly model: string
}) =>
  Effect.gen(function*() {
    const client = yield* OpenAiClient
    const config = yield* OpenAiConfig.getOrUndefined

    const makeRequest = ({ input, required, system, tools }: Completions.CompletionOptions) =>
      Effect.map(
        Effect.context<never>(),
        (context): typeof Generated.CreateChatCompletionRequest.Encoded => ({
          model: options.model,
          ...config,
          ...context.unsafeMap.get(OpenAiConfig.key),
          messages: makeMessages(input, system),
          tools: tools.length > 0 ?
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
          tool_choice: tools.length > 0 ?
            typeof required === "boolean" ? (required ? "required" : "auto") : {
              type: "function",
              function: { name: required }
            } :
            undefined
        })
      )

    return yield* Completions.make({
      create(options) {
        return makeRequest(options).pipe(
          Effect.flatMap(client.client.createChatCompletion),
          Effect.catchAll((cause) =>
            Effect.fail(
              new AiError({
                module: "OpenAiCompletions",
                method: "create",
                description: "An error occurred",
                cause
              })
            )
          ),
          Effect.flatMap((response) => makeResponse(response, "create"))
        )
      },
      stream(options) {
        return makeRequest(options).pipe(
          Effect.map(client.stream),
          Stream.unwrap,
          Stream.catchAll((cause) =>
            Effect.fail(
              new AiError({
                module: "OpenAiCompletions",
                method: "stream",
                description: "An error occurred",
                cause
              })
            )
          ),
          Stream.map((response) => response.asAiResponse)
        )
      }
    })
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layerCompletions = (options: {
  readonly model: string
}): Layer.Layer<Completions.Completions, never, OpenAiClient> => Layer.effect(Completions.Completions, make(options))

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options: {
  readonly model: string
}): Layer.Layer<Completions.Completions | Tokenizer.Tokenizer, never, OpenAiClient> =>
  Layer.merge(layerCompletions(options), OpenAiTokenizer.layer(options))

const makeMessages = (
  input: AiInput.AiInput,
  system: Option.Option<string>
): Arr.NonEmptyReadonlyArray<typeof Generated.ChatCompletionRequestMessage.Encoded> => {
  const messages: Array<typeof Generated.ChatCompletionRequestMessage.Encoded> = system._tag === "Some" ?
    [makeSystemMessage(system.value)] :
    []
  for (const message of input) {
    // eslint-disable-next-line no-restricted-syntax
    messages.push(...convertMessage(message))
  }
  return messages as any
}

const formatRole = (role: AiRole.AiRole) => {
  switch (role._tag) {
    case "UserWithName":
      return {
        role: "user",
        name: safeName(role.name)
      } as const
    case "User":
      return {
        role: "user"
      } as const
    case "Model":
      return {
        role: "assistant"
      } as const
  }
}

const convertMessage = (
  message: AiInput.Message
): Array<typeof Generated.ChatCompletionRequestMessage.Encoded> => {
  const messages: Array<typeof Generated.ChatCompletionRequestMessage.Encoded> = []
  let parts: Array<typeof Generated.ChatCompletionRequestUserMessageContentPart.Encoded> = []
  let toolCalls: Array<typeof Generated.ChatCompletionMessageToolCall.Encoded> = []
  function flushContent() {
    if (parts.length === 0) return
    messages.push({
      ...formatRole(message.role),
      content: parts as any
    })
    parts = []
  }
  function flushToolCalls() {
    if (toolCalls.length === 0) return
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: toolCalls
    })
    toolCalls = []
  }
  for (const part of message.parts) {
    if (part._tag === "ToolCall") {
      flushContent()
      toolCalls.push({
        id: part.id,
        type: "function",
        function: {
          name: part.name,
          arguments: JSON.stringify(part.params)
        }
      })
    } else if (part._tag === "ToolCallResolved") {
      flushContent()
      flushToolCalls()
      messages.push({
        role: "tool",
        tool_call_id: part.toolCallId,
        content: JSON.stringify(part.value)
      })
    } else {
      flushToolCalls()
      parts.push(makeContentPart(part))
    }
  }
  flushContent()
  flushToolCalls()
  return messages
}

const makeContentPart = (
  part: AiInput.TextPart | AiInput.ImagePart | AiInput.ImageUrlPart
): typeof Generated.ChatCompletionRequestUserMessageContentPart.Encoded => {
  switch (part._tag) {
    case "Image":
      return {
        type: "image_url",
        image_url: {
          url: part.asDataUri,
          detail: part.quality
        }
      }
    case "ImageUrl":
      return {
        type: "image_url",
        image_url: {
          url: part.url,
          detail: part.quality
        }
      }
    case "Text":
      return {
        type: "text",
        text: part.content
      }
  }
}

const makeResponse = (
  response: Generated.CreateChatCompletionResponse,
  method: string
): Effect.Effect<AiResponse.AiResponse, AiError> =>
  Arr.head(response.choices).pipe(
    Effect.mapError(() =>
      new AiError({
        module: "OpenAiCompletions",
        method,
        description: "Could not get response"
      })
    ),
    Effect.flatMap((choice) => {
      const response = typeof choice.message.content === "string" ?
        AiResponse.AiResponse.fromText({
          role: AiRole.model,
          content: choice.message.content!
        }) :
        AiResponse.AiResponse.empty

      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        return response.withToolCallsJson(choice.message.tool_calls.map((toolCall) => ({
          id: toolCall.id,
          name: toolCall.function.name,
          params: toolCall.function.arguments
        })))
      }

      return Effect.succeed(response)
    })
  )

const makeSystemMessage = (content: string): typeof Generated.ChatCompletionRequestSystemMessage.Encoded => {
  return {
    role: "system",
    content
  }
}

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/, "_")
