import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { Effect, Schema } from "effect"
import * as Response from "effect/unstable/ai/Response"

describe("Response", () => {
  it("constructs tool call parts from provider JSON", () => {
    deepStrictEqual(
      Response.toolCallPartFromJson({
        id: "call-1",
        name: "get_weather",
        params: "{\"city\":\"Denver\"}"
      }),
      {
        type: "tool-call",
        id: "call-1",
        name: "get_weather",
        params: { city: "Denver" }
      }
    )
  })

  it("preserves malformed provider JSON as a tool call error", () => {
    const part = Response.toolCallPartFromJson({
      id: "call-1",
      name: "get_weather",
      params: "{"
    })

    deepStrictEqual(part.type, "tool-call-error")
    if (part.type === "tool-call-error") {
      deepStrictEqual(part.params, "{")
      deepStrictEqual(part.error._tag, "ToolParameterValidationError")
      if (part.error._tag === "ToolParameterValidationError") {
        deepStrictEqual(part.error.toolParams, "{")
      }
    }
  })

  it.effect("round trips tool call errors", () =>
    Effect.gen(function*() {
      const malformed = Response.toolCallPartFromJson({
        id: "call-1",
        name: "get_weather",
        params: "{"
      })
      if (malformed.type !== "tool-call-error") {
        throw new Error("Expected malformed tool call parameters")
      }
      const error = yield* Schema.decodeEffect(Response.ToolCallError)(malformed.error)
      const part = Response.makePart("tool-call-error", {
        id: "call-1",
        name: "get_weather",
        params: { city: 42 },
        error,
        providerExecuted: false
      })

      const encoded = yield* Schema.encodeEffect(Response.ToolCallErrorPart)(part)
      const decoded = yield* Schema.decodeEffect(Response.ToolCallErrorPart)(encoded)

      deepStrictEqual(decoded, part)
    }))

  it.effect("decodes response metadata with omitted optional fields", () =>
    Effect.gen(function*() {
      const encoded: Response.ResponseMetadataPartEncoded = {
        type: "response-metadata"
      }

      const decoded = yield* Schema.decodeUnknownEffect(Response.ResponseMetadataPart)(encoded)

      deepStrictEqual(decoded, Response.makePart("response-metadata", {}))
    }))

  it.effect("round trips response metadata with undefined optional fields through JSON", () =>
    Effect.gen(function*() {
      const part = Response.makePart("response-metadata", {
        id: undefined,
        modelId: undefined,
        timestamp: undefined,
        request: undefined
      })

      const encoded = yield* Schema.encodeEffect(Response.ResponseMetadataPart)(part)
      const json = JSON.parse(JSON.stringify(encoded))
      const decoded = yield* Schema.decodeUnknownEffect(Response.ResponseMetadataPart)(json)

      deepStrictEqual(json, {
        metadata: {},
        type: "response-metadata"
      }, "encoded JSON")
      deepStrictEqual(decoded, Response.makePart("response-metadata", {}), "decoded part")
    }))

  it.effect("round trips HTTP request details with an undefined hash through JSON", () =>
    Effect.gen(function*() {
      const request: typeof Response.HttpRequestDetails.Type = {
        method: "POST",
        url: "https://example.com/v1/responses",
        urlParams: [],
        hash: undefined,
        headers: {}
      }

      const encoded = yield* Schema.encodeEffect(Response.HttpRequestDetails)(request)
      const json = JSON.parse(JSON.stringify(encoded))
      const decoded = yield* Schema.decodeUnknownEffect(Response.HttpRequestDetails)(json)

      deepStrictEqual(json, {
        method: "POST",
        url: "https://example.com/v1/responses",
        urlParams: [],
        headers: {}
      }, "encoded JSON")
      deepStrictEqual(decoded, {
        method: "POST",
        url: "https://example.com/v1/responses",
        urlParams: [],
        headers: {}
      }, "decoded request")
    }))

  it.effect("round trips a finish part with undefined optional fields through JSON", () =>
    Effect.gen(function*() {
      const part = Response.makePart("finish", {
        reason: "stop",
        usage: new Response.Usage({
          inputTokens: {
            uncached: undefined,
            total: undefined,
            cacheRead: undefined,
            cacheWrite: undefined
          },
          outputTokens: {
            total: undefined,
            text: undefined,
            reasoning: undefined
          }
        }),
        response: undefined
      })

      const encoded = yield* Schema.encodeEffect(Response.FinishPart)(part)
      const json = JSON.parse(JSON.stringify(encoded))
      const decoded = yield* Schema.decodeUnknownEffect(Response.FinishPart)(json)

      deepStrictEqual(json, {
        metadata: {},
        type: "finish",
        reason: "stop",
        usage: {
          inputTokens: {},
          outputTokens: {}
        }
      }, "encoded JSON")
      deepStrictEqual(
        decoded,
        Response.makePart("finish", {
          reason: "stop",
          usage: new Response.Usage({
            inputTokens: {},
            outputTokens: {}
          })
        }),
        "decoded part"
      )
    }))
})
