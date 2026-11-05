/** @internal */
import * as AiError from "effect/ai/AiError"
import type * as RealtimeModel from "effect/ai/RealtimeModel"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

const WireEvent = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Json))
const decode = Schema.decodeUnknownEffect(WireEvent)
const json = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Json))
const encoder = new TextEncoder()

export const invalidResponse = (description: string): AiError.AiError =>
  AiError.make({
    module: "OpenAiRealtimeModel",
    method: "events",
    reason: new AiError.InvalidResponseError({ description })
  })
export const invalidInput = (description: string): AiError.AiError =>
  AiError.make({
    module: "OpenAiRealtimeModel",
    method: "connect",
    reason: new AiError.InvalidUserInputError({ description })
  })

export const decodeWire = (message: string, maxBytes: number) =>
  message.length > maxBytes || encoder.encode(message).byteLength > maxBytes
    ? Effect.fail(invalidResponse("Realtime WebSocket message exceeds the configured byte limit"))
    : decode(message).pipe(Effect.mapError(() => invalidResponse("Invalid realtime JSON message")))

const text = (record: Schema.JsonObject, key: string): Effect.Effect<string, AiError.AiError> =>
  typeof record[key] === "string"
    ? Effect.succeed(record[key])
    : Effect.fail(invalidResponse(`Missing or invalid realtime field: ${key}`))
const integer = (record: Schema.JsonObject, key: string): Effect.Effect<number, AiError.AiError> => {
  const value = record[key]
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? Effect.succeed(value)
    : Effect.fail(invalidResponse(`Missing or invalid realtime field: ${key}`))
}
const object = (record: Schema.JsonObject, key: string): Effect.Effect<Schema.JsonObject, AiError.AiError> => {
  const value = record[key]
  return Schema.is(Schema.JsonObject)(value)
    ? Effect.succeed(value)
    : Effect.fail(invalidResponse(`Missing or invalid realtime object: ${key}`))
}

export const providerError = Effect.fnUntraced(function*(event: Schema.JsonObject) {
  const error = yield* object(event, "error")
  const description = yield* text(error, "message")
  const code = typeof error.code === "string" ? error.code : "unknown"
  const type = typeof error.type === "string" ? error.type : "unknown"
  const quota = code === "insufficient_quota" || type === "insufficient_quota" ||
    code === "billing_insufficient_balance" || type === "billing_insufficient_balance"
  const status = code.includes("rate_limit") || type === "rate_limit_error" ?
    429
    : code.includes("auth") || type.includes("auth") || code === "invalid_api_key" ?
    401
    : type === "invalid_request_error" || code === "invalid_request_error" ?
    400
    : 500
  return AiError.make({
    module: "OpenAiRealtimeModel",
    method: "events",
    reason: quota
      ? new AiError.QuotaExhaustedError({ metadata: { openai: { errorCode: code, errorType: type } } })
      : AiError.reasonFromHttpStatus({ status, description })
  })
})

export const makeDecoder = (maxEventBytes: number) => {
  // Retain only active text plus bounded revision counters; never retain audio.
  const transcripts = new Map<string, { readonly text: string; readonly revision: number }>()
  const transcript = Effect.fnUntraced(function*(event: Schema.JsonObject, role: "user" | "assistant", final: boolean) {
    const itemId = yield* text(event, "item_id")
    const previous = transcripts.get(itemId)
    if (previous === undefined && transcripts.size >= 1024) {
      return yield* invalidResponse("Realtime transcript item limit exceeded")
    }
    const next = final ? yield* text(event, "transcript") : (previous?.text ?? "") + (yield* text(event, "delta"))
    if (next.length * 3 > maxEventBytes) return yield* invalidResponse("Realtime transcript exceeds the event limit")
    const revision = (previous?.revision ?? 0) + 1
    transcripts.set(itemId, { text: final ? "" : next, revision })
    return {
      type: "transcript" as const,
      itemId,
      role,
      text: next,
      revision,
      isFinal: final,
      responseId: typeof event.response_id === "string" ? event.response_id : undefined
    }
  })
  return Effect.fnUntraced(
    function*(event: Schema.JsonObject): Effect.fn.Return<Option.Option<RealtimeModel.Event>, AiError.AiError> {
      const type = yield* text(event, "type")
      switch (type) {
        case "error": {
          const error = yield* providerError(event)
          const details = yield* object(event, "error")
          if (typeof details.event_id === "string" || error.reason._tag === "InvalidRequestError") {
            return Option.some({
              type: "command-error",
              eventId: typeof details.event_id === "string" ? details.event_id : undefined,
              error
            })
          }
          return yield* error
        }
        case "response.created": {
          const response = yield* object(event, "response")
          return Option.some({ type: "response-start", responseId: yield* text(response, "id") })
        }
        case "response.output_audio.delta": {
          const encoded = yield* text(event, "delta")
          const decoded = Base64.decode(encoded)
          if (Result.isFailure(decoded)) return yield* invalidResponse("Invalid realtime audio base64")
          return Option.some({
            type: "audio-delta",
            responseId: yield* text(event, "response_id"),
            itemId: yield* text(event, "item_id"),
            contentIndex: yield* integer(event, "content_index"),
            delta: decoded.success
          })
        }
        case "response.output_audio.done":
          return Option.some({
            type: "audio-end",
            responseId: yield* text(event, "response_id"),
            itemId: yield* text(event, "item_id"),
            contentIndex: yield* integer(event, "content_index")
          })
        case "response.output_audio_transcript.delta":
          return Option.some(yield* transcript(event, "assistant", false))
        case "response.output_audio_transcript.done":
          return Option.some(yield* transcript(event, "assistant", true))
        case "conversation.item.input_audio_transcription.delta":
          return Option.some(yield* transcript(event, "user", false))
        case "conversation.item.input_audio_transcription.completed":
          return Option.some(yield* transcript(event, "user", true))
        case "conversation.item.input_audio_transcription.failed":
          return yield* invalidResponse("Realtime input transcription failed")
        case "response.output_text.delta":
          return Option.some({
            type: "text-delta",
            responseId: yield* text(event, "response_id"),
            itemId: yield* text(event, "item_id"),
            delta: yield* text(event, "delta")
          })
        case "response.done": {
          const response = yield* object(event, "response")
          const status = yield* text(response, "status")
          if (status !== "completed" && status !== "cancelled" && status !== "failed" && status !== "incomplete") {
            return yield* invalidResponse("Invalid realtime response status")
          }
          return Option.some({ type: "response-end", responseId: yield* text(response, "id"), status })
        }
        // Arguments-done also fires for interrupted/incomplete calls. Execute only
        // completed function items, never a partial arguments event.
        case "response.output_item.done": {
          const item = yield* object(event, "item")
          if (item.type !== "function_call" || item.status !== "completed") return Option.none()
          const parameters = yield* json(yield* text(item, "arguments")).pipe(
            Effect.mapError(() => invalidResponse("Invalid completed tool-call arguments"))
          )
          return Option.some({
            type: "tool-call",
            responseId: yield* text(event, "response_id"),
            itemId: yield* text(item, "id"),
            callId: yield* text(item, "call_id"),
            name: yield* text(item, "name"),
            parameters
          })
        }
        case "input_audio_buffer.speech_started":
          return Option.some({
            type: "input-speech-start",
            itemId: yield* text(event, "item_id"),
            audioStartMs: yield* integer(event, "audio_start_ms")
          })
        case "input_audio_buffer.speech_stopped":
          return Option.some({
            type: "input-speech-end",
            itemId: yield* text(event, "item_id"),
            audioEndMs: yield* integer(event, "audio_end_ms")
          })
        case "input_audio_buffer.committed":
          return Option.some({ type: "input-committed", itemId: yield* text(event, "item_id") })
        case "conversation.item.truncated":
          return Option.some({
            type: "item-truncated",
            itemId: yield* text(event, "item_id"),
            contentIndex: yield* integer(event, "content_index"),
            audioEndMs: yield* integer(event, "audio_end_ms")
          })
        default:
          return Option.none()
      }
    }
  )
}

export const encodeCommand = (command: RealtimeModel.Command): string => {
  const eventId = command.eventId === undefined ? {} : { event_id: command.eventId }
  switch (command.type) {
    case "audio-append":
      return JSON.stringify({ ...eventId, type: "input_audio_buffer.append", audio: Base64.encode(command.data) })
    case "audio-commit":
      return JSON.stringify({ ...eventId, type: "input_audio_buffer.commit" })
    case "audio-clear":
      return JSON.stringify({ ...eventId, type: "input_audio_buffer.clear" })
    case "text":
      return JSON.stringify({
        ...eventId,
        type: "conversation.item.create",
        item: {
          type: "message",
          role: command.role ?? "user",
          content: [{ type: command.role === "assistant" ? "output_text" : "input_text", text: command.text }]
        }
      })
    case "response-create":
      return JSON.stringify({ ...eventId, type: "response.create" })
    case "response-cancel":
      return JSON.stringify({ ...eventId, type: "response.cancel", response_id: command.responseId })
    case "item-truncate":
      return JSON.stringify({
        ...eventId,
        type: "conversation.item.truncate",
        item_id: command.itemId,
        content_index: command.contentIndex,
        audio_end_ms: command.audioEndMs
      })
    case "tool-result":
      return JSON.stringify({
        ...eventId,
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: command.callId,
          output: JSON.stringify(command.output)
        }
      })
  }
}
