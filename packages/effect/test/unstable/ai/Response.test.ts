import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { Effect, Schema } from "effect"
import { TestSchema } from "effect/testing"
import { Response, Tool, Toolkit } from "effect/unstable/ai"

describe("Response", () => {
  describe("provider-defined tool execution failures", () => {
    const tool = Tool.providerDefined({
      id: "test.provider_tool",
      customName: "ProviderTool",
      providerName: "provider_tool",
      success: Schema.Unknown
    })()
    const schema = Response.AllParts(Toolkit.make(tool))

    for (
      const result of [
        { type: "execution-denied", reason: "User declined" },
        {
          type: "execution-interrupted",
          reason: "Tool call execution was interrupted because the response finished with reason \"length\""
        }
      ]
    ) {
      it.effect(`round trips ${result.type} through AllParts JSON`, () =>
        Effect.gen(function*() {
          const part = Response.makePart("tool-result", {
            id: "tool-123",
            name: tool.name,
            isFailure: true,
            result,
            encodedResult: result,
            providerExecuted: false,
            preliminary: false
          })

          const encoded = yield* Schema.encodeUnknownEffect(schema)(part)
          const decoded = yield* Schema.decodeUnknownEffect(schema)(JSON.parse(JSON.stringify(encoded)))

          deepStrictEqual<unknown>(decoded, part, "decoded execution failure")
        }))
    }
  })

  describe("tool results with overlapping success and failure types", () => {
    const tool = Tool.make("ResultEncoding", {
      success: Schema.Number,
      failure: Schema.NumberFromString,
      failureMode: "return"
    })
    const schema = Response.ToolResultPart(tool.name, tool.successSchema, tool.failureSchema)
    const allParts = Response.AllParts(Toolkit.make(tool))

    for (const isFailure of [false, true]) {
      const branch = isFailure ? "failure" : "success"
      const encodedResult = isFailure ? "404" : 404
      const part = Response.makePart("tool-result", {
        id: "tool-123",
        name: "ResultEncoding",
        isFailure,
        result: 404,
        encodedResult,
        providerExecuted: false,
        preliminary: false
      })

      it.effect(`encodes a ${branch} with the ${branch} schema`, () =>
        Effect.gen(function*() {
          const encoded = yield* Schema.encodeEffect(schema)(part)

          deepStrictEqual(encoded, {
            type: "tool-result",
            id: "tool-123",
            name: "ResultEncoding",
            isFailure,
            result: encodedResult,
            providerExecuted: false,
            preliminary: false,
            metadata: {}
          }, "encoded tool result")
        }))

      it(`rejects an encodedResult from the other branch for a ${branch}`, () =>
        new TestSchema.Asserts(schema).encoding().fail(
          { ...part, encodedResult: isFailure ? 404 : "404" },
          `Expected ${isFailure ? "string" : "number"}\n  at ["encodedResult"]`
        ))

      it.effect(`preserves a ${branch} encodedResult through an AllParts JSON round trip`, () =>
        Effect.gen(function*() {
          const encoded = yield* Schema.encodeEffect(allParts)(part)
          const decoded = yield* Schema.decodeUnknownEffect(allParts)(JSON.parse(JSON.stringify(encoded)))

          deepStrictEqual(decoded, part, "decoded tool result")
        }))
    }
  })

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
