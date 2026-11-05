import * as Protocol from "@effect/ai-openai/internal/realtime"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import type * as RealtimeModel from "effect/ai/RealtimeModel"

describe("OpenAI realtime protocol", () => {
  it.effect("classifies specific command codes by their provider error type", () =>
    Effect.gen(function*() {
      const decode = Protocol.makeDecoder(1024)
      const event = Option.getOrThrow(
        yield* decode({
          type: "error",
          error: {
            type: "invalid_request_error",
            code: "response_cancel_not_active",
            message: "No active response"
          }
        })
      )
      assert.strictEqual(event.type, "command-error")
      if (event.type !== "command-error") return
      assert.strictEqual(event.error.reason._tag, "InvalidRequestError")
    }))

  it.effect("distinguishes exhausted quota from retryable rate limits", () =>
    Effect.gen(function*() {
      for (const code of ["insufficient_quota", "billing_insufficient_balance"]) {
        const error = yield* Protocol.providerError({
          error: { code, type: "insufficient_quota", message: "Check your billing" }
        })
        assert.strictEqual(error.reason._tag, "QuotaExhaustedError")
        assert.isFalse(error.isRetryable)
      }
      const error = yield* Protocol.providerError({
        error: { code: "rate_limit_exceeded", type: "rate_limit_error", message: "Slow down" }
      })
      assert.strictEqual(error.reason._tag, "RateLimitError")
      assert.isTrue(error.isRetryable)
    }))

  it.effect("replaces transcript snapshots with monotonically increasing revisions", () =>
    Effect.gen(function*() {
      const decode = Protocol.makeDecoder(1024)
      const events = []
      for (
        const event of [
          { type: "conversation.item.input_audio_transcription.delta", item_id: "user", delta: "two " },
          { type: "conversation.item.input_audio_transcription.delta", item_id: "user", delta: "pizzas" },
          { type: "conversation.item.input_audio_transcription.completed", item_id: "user", transcript: "Two pizzas." },
          {
            type: "response.output_audio_transcript.delta",
            item_id: "assistant",
            response_id: "r",
            delta: "Certainly"
          },
          {
            type: "response.output_audio_transcript.done",
            item_id: "assistant",
            response_id: "r",
            transcript: "Certainly!"
          }
        ]
      ) events.push(Option.getOrThrow(yield* decode(event)))
      assert.deepStrictEqual(events, [
        {
          type: "transcript",
          itemId: "user",
          role: "user",
          text: "two ",
          revision: 1,
          isFinal: false,
          responseId: undefined
        },
        {
          type: "transcript",
          itemId: "user",
          role: "user",
          text: "two pizzas",
          revision: 2,
          isFinal: false,
          responseId: undefined
        },
        {
          type: "transcript",
          itemId: "user",
          role: "user",
          text: "Two pizzas.",
          revision: 3,
          isFinal: true,
          responseId: undefined
        },
        {
          type: "transcript",
          itemId: "assistant",
          role: "assistant",
          text: "Certainly",
          revision: 1,
          isFinal: false,
          responseId: "r"
        },
        {
          type: "transcript",
          itemId: "assistant",
          role: "assistant",
          text: "Certainly!",
          revision: 2,
          isFinal: true,
          responseId: "r"
        }
      ])
    }))

  it.effect("emits calls only for completed function output items", () =>
    Effect.gen(function*() {
      const decode = Protocol.makeDecoder(1024)
      const item = {
        id: "item",
        type: "function_call",
        call_id: "call",
        name: "lookup",
        arguments: "{\"query\":\"pizza\"}"
      }
      for (
        const event of [
          { ...item, type: "response.function_call_arguments.done", response_id: "r" },
          { type: "response.output_item.done", response_id: "r", item: { ...item, status: "incomplete" } },
          { type: "response.output_item.done", response_id: "r", item: { ...item, status: "cancelled" } }
        ]
      ) assert.isTrue(Option.isNone(yield* decode(event)))
      assert.deepStrictEqual(
        Option.getOrThrow(
          yield* decode({
            type: "response.output_item.done",
            response_id: "r",
            item: { ...item, status: "completed" }
          })
        ),
        {
          type: "tool-call",
          responseId: "r",
          itemId: "item",
          callId: "call",
          name: "lookup",
          parameters: { query: "pizza" }
        }
      )
    }))

  it.effect("maps speech, response, audio and truncation events with their correlation fields", () =>
    Effect.gen(function*() {
      const decode = Protocol.makeDecoder(1024)
      const inputs = [
        { type: "response.created", response: { id: "r" } },
        { type: "response.output_audio.delta", response_id: "r", item_id: "i", content_index: 0, delta: "AQID" },
        { type: "response.output_audio.done", response_id: "r", item_id: "i", content_index: 0 },
        { type: "input_audio_buffer.speech_started", item_id: "u", audio_start_ms: 10 },
        { type: "input_audio_buffer.speech_stopped", item_id: "u", audio_end_ms: 25 },
        { type: "input_audio_buffer.committed", item_id: "u" },
        { type: "conversation.item.truncated", item_id: "i", content_index: 0, audio_end_ms: 15 },
        { type: "response.output_text.delta", response_id: "r", item_id: "i", delta: "Hello" },
        { type: "response.done", response: { id: "r", status: "cancelled" } }
      ]
      const actual = []
      for (const event of inputs) actual.push(Option.getOrThrow(yield* decode(event)))
      assert.deepStrictEqual(actual, [
        { type: "response-start", responseId: "r" },
        { type: "audio-delta", responseId: "r", itemId: "i", contentIndex: 0, delta: new Uint8Array([1, 2, 3]) },
        { type: "audio-end", responseId: "r", itemId: "i", contentIndex: 0 },
        { type: "input-speech-start", itemId: "u", audioStartMs: 10 },
        { type: "input-speech-end", itemId: "u", audioEndMs: 25 },
        { type: "input-committed", itemId: "u" },
        { type: "item-truncated", itemId: "i", contentIndex: 0, audioEndMs: 15 },
        { type: "text-delta", responseId: "r", itemId: "i", delta: "Hello" },
        { type: "response-end", responseId: "r", status: "cancelled" }
      ])
    }))

  it.effect("ignores unknown event types without accepting malformed known events", () =>
    Effect.gen(function*() {
      const decode = Protocol.makeDecoder(1024)
      assert.isTrue(Option.isNone(yield* decode({ type: "future.provider.event", payload: true })))
      for (
        const event of [
          {},
          {
            type: "response.output_audio.delta",
            delta: "not base64!",
            response_id: "r",
            item_id: "i",
            content_index: 0
          },
          { type: "response.output_audio.done", response_id: "r", item_id: "i", content_index: -1 },
          { type: "response.done", response: { id: "r", status: "invented" } },
          {
            type: "response.output_item.done",
            response_id: "r",
            item: { type: "function_call", status: "completed", arguments: "{" }
          },
          { type: "conversation.item.input_audio_transcription.failed" }
        ]
      ) {
        const error = yield* decode(event).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidResponseError")
      }
    }))

  it.effect("rejects malformed JSON, nonobject roots and UTF-8 byte overruns", () =>
    Effect.gen(function*() {
      for (const [input, max] of [["{", 1024], ["[]", 1024], ["null", 1024], ["{\"x\":\"ééé\"}", 13]] as const) {
        const error = yield* Protocol.decodeWire(input, max).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidResponseError")
      }
    }))

  it.effect("bounds accumulated transcript state across individually small deltas", () =>
    Effect.gen(function*() {
      const decode = Protocol.makeDecoder(18)
      yield* decode({ type: "conversation.item.input_audio_transcription.delta", item_id: "u", delta: "123456" })
      const error = yield* decode({
        type: "conversation.item.input_audio_transcription.delta",
        item_id: "u",
        delta: "7"
      }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "InvalidResponseError")
    }))

  it("encodes every command with IDs, base64 audio and provider field names", () => {
    const commands: Array<RealtimeModel.Command> = [
      { type: "audio-append", data: new Uint8Array([0, 255, 1]), eventId: "a" },
      { type: "audio-commit" },
      { type: "audio-clear" },
      { type: "text", text: "Hello" },
      { type: "text", text: "Hi", role: "assistant" },
      { type: "response-create" },
      { type: "response-cancel", responseId: "r" },
      { type: "item-truncate", itemId: "i", contentIndex: 0, audioEndMs: 125 },
      { type: "tool-result", callId: "call", output: { ok: true } }
    ]
    assert.deepStrictEqual(commands.map((command) => JSON.parse(Protocol.encodeCommand(command))), [
      { type: "input_audio_buffer.append", event_id: "a", audio: "AP8B" },
      { type: "input_audio_buffer.commit" },
      { type: "input_audio_buffer.clear" },
      {
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text", text: "Hello" }] }
      },
      {
        type: "conversation.item.create",
        item: { type: "message", role: "assistant", content: [{ type: "output_text", text: "Hi" }] }
      },
      { type: "response.create" },
      { type: "response.cancel", response_id: "r" },
      { type: "conversation.item.truncate", item_id: "i", content_index: 0, audio_end_ms: 125 },
      {
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: "call", output: "{\"ok\":true}" }
      }
    ])
  })
})
