import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { Effect, Schema } from "effect"
import { AiError, Response, Toolkit } from "effect/unstable/ai"

describe("Response", () => {
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

  it.effect("round-trips a tool call error through the schema for all parts", () =>
    Effect.gen(function*() {
      // A tool call error names a tool which is not in the toolkit, so the
      // schema for every part admits it regardless of the toolkit
      const schema = Response.AllParts(Toolkit.empty)
      const part = Response.makePart("tool-call-error", {
        id: "call-unknown",
        name: "NotATool",
        params: { city: "Paris" },
        error: AiError.make({
          module: "LanguageModel",
          method: "generateText",
          reason: new AiError.ToolNotFoundError({ toolName: "NotATool", availableTools: [] })
        })
      })

      const encoded = yield* Schema.encodeEffect(schema)(part)
      const decoded = yield* Schema.decodeEffect(schema)(encoded)

      deepStrictEqual(decoded.type, "tool-call-error")
      if (decoded.type === "tool-call-error") {
        deepStrictEqual(decoded.name, "NotATool")
        deepStrictEqual(decoded.params, { city: "Paris" })
        deepStrictEqual(decoded.error.reason._tag, "ToolNotFoundError")
      }
    }))
})
