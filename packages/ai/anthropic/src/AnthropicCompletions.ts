/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import type * as AiInput from "@effect/ai/AiInput"
import * as AiResponse from "@effect/ai/AiResponse"
import * as AiRole from "@effect/ai/AiRole"
import { addGenAIAnnotations } from "@effect/ai/AiTelemetry"
import * as Completions from "@effect/ai/Completions"
import type * as Tokenizer from "@effect/ai/Tokenizer"
import * as Arr from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { StreamChunk } from "./AnthropicClient.js"
import { AnthropicClient } from "./AnthropicClient.js"
import { AnthropicConfig } from "./AnthropicConfig.js"
import * as AnthropicTokenizer from "./AnthropicTokenizer.js"
import type * as Generated from "./Generated.js"

/**
 * @since 1.0.0
 * @category models
 */
export type Model = typeof Generated.Model.Encoded

const make = (options: { readonly model: (string & {}) | Model }) =>
  Effect.gen(function*() {
    const client = yield* AnthropicClient
    const config = yield* AnthropicConfig.getOrUndefined

    const makeRequest = ({
      input,
      required,
      system,
      tools
    }: Completions.CompletionOptions) => {
      const useStructured = tools.length === 1 && tools[0].structured
      return Effect.map(
        Effect.context<never>(),
        (context): typeof Generated.CreateMessageParams.Encoded => ({
          model: options.model,
          // TODO: re-evaluate a better way to do this
          max_tokens: 4096,
          ...config,
          ...context.unsafeMap.get(AnthropicConfig.key),
          system: Option.getOrUndefined(system),
          messages: makeMessages(input),
          tools: tools.length === 0 ? undefined : tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters as any
          })),
          tool_choice: !useStructured && tools.length > 0
            // For non-structured outputs, ensure tools are used if required
            ? typeof required === "boolean"
              ? required ? { type: "any" } : { type: "auto" }
              : { type: "tool", name: required }
            // For structured outputs, ensure the json output tool is used
            : useStructured
            ? { type: "tool", name: tools[0].name }
            : undefined
        })
      )
    }

    return yield* Completions.make({
      create({ span, ...options }) {
        return makeRequest(options).pipe(
          Effect.tap((request) => annotateRequest(span, request)),
          Effect.flatMap((payload) => client.client.messagesPost({ params: {}, payload })),
          Effect.tap((response) => annotateChatResponse(span, response)),
          Effect.flatMap((response) =>
            makeResponse(
              response,
              "create",
              options.tools.length === 1 && options.tools[0].structured
                ? options.tools[0]
                : undefined
            )
          ),
          Effect.catchAll((cause) =>
            Effect.fail(
              new AiError({
                module: "AnthropicCompletions",
                method: "create",
                description: "An error occurred",
                cause
              })
            )
          )
        )
      },
      stream({ span, ...options }) {
        return makeRequest(options).pipe(
          Effect.tap((request) => annotateRequest(span, request)),
          Effect.map(client.stream),
          Stream.unwrap,
          Stream.tap((response) => {
            annotateStreamResponse(span, response)
            return Effect.void
          }),
          Stream.map((response) => response.asAiResponse),
          Stream.catchAll((cause) =>
            Effect.fail(
              new AiError({
                module: "AnthropicCompletions",
                method: "stream",
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
 * @category layers
 */
export const layerCompletions = (options: {
  readonly model: (string & {}) | Model
}): Layer.Layer<Completions.Completions, never, AnthropicClient> => Layer.effect(Completions.Completions, make(options))

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options: {
  readonly model: (string & {}) | Model
}): Layer.Layer<
  Completions.Completions | Tokenizer.Tokenizer,
  never,
  AnthropicClient
> => Layer.merge(layerCompletions(options), AnthropicTokenizer.layer)

const makeMessages = (
  aiInput: AiInput.AiInput
): Arr.NonEmptyReadonlyArray<typeof Generated.InputMessage.Encoded> => {
  const messages: Array<typeof Generated.InputMessage.Encoded> = []
  for (const input of aiInput) {
    for (const message of convertMessage(input)) {
      messages.push(message)
    }
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
): Array<typeof Generated.InputMessage.Encoded> => {
  const messages: Array<typeof Generated.InputMessage.Encoded> = []
  let parts: Array<typeof Generated.InputContentBlock.Encoded> = []
  let toolCalls: Array<typeof Generated.RequestToolUseBlock.Encoded> = []
  function flushContent() {
    if (parts.length === 0) return
    messages.push({
      ...formatRole(message.role),
      content: parts
    })
    parts = []
  }
  function flushToolCalls() {
    if (toolCalls.length === 0) return
    messages.push({
      role: "assistant",
      content: toolCalls
    })
    toolCalls = []
  }
  for (const part of message.parts) {
    if (part._tag === "ToolCall") {
      flushContent()
      toolCalls.push({
        id: part.id,
        type: "tool_use",
        name: part.name,
        input: part.params as Record<string, unknown>
      })
    } else if (part._tag === "ToolCallResolved") {
      flushContent()
      flushToolCalls()
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: part.toolCallId,
            content: JSON.stringify(part.value)
          }
        ]
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
): typeof Generated.InputContentBlock.Encoded => {
  switch (part._tag) {
    case "Image":
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: part.image.contentType as any,
          data: part.asBase64
        }
      }
    case "ImageUrl":
      throw new AiError({
        module: "AnthropicCompletions",
        method: "create",
        description: "Anthropic does not currently support adding URLs in either the text or image blocks"
      })
    case "Text":
      return {
        type: "text",
        text: part.content
      }
  }
}

const makeResponse = Effect.fnUntraced(function*(
  response: Generated.Message,
  method: string,
  structuredTool?: {
    readonly name: string
    readonly description: string
  }
) {
  if (response.stop_reason === "tool_use") {
    const [text, toolUse] = Arr.partition(
      response.content,
      (chunk) => chunk.type === "tool_use"
    )
    if (structuredTool === undefined || toolUse.length !== 1) {
      return yield* new AiError({
        module: "AnthropicCompletions",
        method,
        description: "Unable to extract structured output tool call information from response"
      })
    }
    const textParts = text.map(({ text }) => AiResponse.TextPart.fromContent(text))
    const toolCallPart = AiResponse.ToolCallPart.fromUnknown({
      id: toolUse[0].id,
      name: toolUse[0].name,
      params: toolUse[0].input
    })
    return AiResponse.AiResponse.make({
      role: AiRole.model,
      parts: Chunk.unsafeFromArray([...textParts, toolCallPart])
    })
  }
  const parts = response.content.map((chunk) =>
    chunk.type === "text"
      ? AiResponse.TextPart.fromContent(chunk.text)
      : AiResponse.ToolCallPart.fromUnknown({
        id: chunk.id,
        name: chunk.name,
        params: chunk.input
      })
  )
  return AiResponse.AiResponse.make({
    role: AiRole.model,
    parts: Chunk.unsafeFromArray(parts)
  })
})

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/, "_")

const annotateRequest = (
  span: Span,
  request: typeof Generated.CreateMessageParams.Encoded
): void => {
  addGenAIAnnotations(span, {
    system: "anthropic",
    operation: { name: "chat" },
    request: {
      model: request.model,
      temperature: request.temperature,
      topK: request.top_k,
      topP: request.top_p,
      maxTokens: request.max_tokens,
      stopSequences: Arr.ensure(request.stop_sequences).filter(
        Predicate.isNotNullable
      )
    }
  })
}

const annotateChatResponse = (
  span: Span,
  response: typeof Generated.Message.Encoded
): void => {
  addGenAIAnnotations(span, {
    response: {
      id: response.id,
      model: response.model,
      finishReasons: response.stop_reason ? [response.stop_reason] : undefined
    },
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    }
  })
}

const annotateStreamResponse = (span: Span, response: StreamChunk) => {
  const usage = response.parts.find((part) => part._tag === "Usage")
  if (Predicate.isNotNullable(usage)) {
    addGenAIAnnotations(span, {
      response: {
        id: usage.id,
        model: usage.model,
        finishReasons: usage.finishReasons
      },
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens
      }
    })
  }
}
