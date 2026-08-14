import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import { McpConformance, type McpConformanceLayer } from "./McpConformance.ts"
import { mrtrRequestState, MrtrToolName } from "./McpConformanceFixtures.ts"

const decodeInputRequired = Schema.decodeUnknownEffect(Schema.Struct({
  resultType: Schema.Literal("input_required"),
  inputRequests: Schema.Record(Schema.String, Schema.Unknown),
  requestState: Schema.String
}))

const decodeComplete = Schema.decodeUnknownEffect(Schema.Struct({
  resultType: Schema.Literal("complete"),
  content: Schema.Array(Schema.Struct({
    type: Schema.Literal("text"),
    text: Schema.String
  }))
}))

const inputResponses = {
  approval: { action: "accept", content: { approved: true } },
  sample: {
    role: "assistant",
    content: { type: "text", text: "Suggested title", _meta: {} },
    model: "fixture-model",
    _meta: {}
  },
  roots: { roots: [{ uri: "file:///workspace" }] }
} as const

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: McpConformanceLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Multi round-trip requests", () => {
      // SEP-2322: https://modelcontextprotocol.io/seps/2322-MRTR
      // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr#server-requirements-basic-workflow
      it.effect("should return supported keyed input requests and resume when matching responses are supplied", () =>
        Effect.gen(function*() {
          const test = yield* McpConformance
          const initialized = yield* test.initialize({ server: "features" })
          const firstResponse = yield* test.send(initialized, {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: MrtrToolName, arguments: {} }
          })
          const first = yield* test.decodeResult(firstResponse).pipe(
            Effect.flatMap((message) => decodeInputRequired(message.result))
          )

          assert.strictEqual(first.requestState, mrtrRequestState)
          assert.deepStrictEqual(first.inputRequests, {
            approval: {
              method: "elicitation/create",
              params: {
                message: "Approve the operation",
                requestedSchema: {
                  type: "object",
                  properties: { approved: { type: "boolean" } },
                  required: ["approved"]
                }
              }
            },
            sample: {
              method: "sampling/createMessage",
              params: {
                messages: [{ role: "user", content: { type: "text", text: "Suggest a title" } }],
                maxTokens: 20
              }
            },
            roots: {
              method: "roots/list"
            }
          })

          const completedResponse = yield* test.send(initialized, {
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
              name: MrtrToolName,
              arguments: {},
              inputResponses,
              requestState: first.requestState
            }
          })
          const completed = yield* test.decodeResult(completedResponse).pipe(
            Effect.flatMap((message) => decodeComplete(message.result))
          )

          const content = completed.content[0]
          assert.isDefined(content)
          assert.deepStrictEqual(JSON.parse(content.text), {
            approval: { approved: true },
            sample: {
              role: "assistant",
              content: { type: "text", text: "Suggested title", _meta: {} },
              model: "fixture-model",
              _meta: {}
            },
            roots: { roots: [{ uri: "file:///workspace" }] }
          })
        }))

      it.effect("should remain input-required when continuation keys or request state do not match", () =>
        Effect.gen(function*() {
          const test = yield* McpConformance
          const initialized = yield* test.initialize({ server: "features" })
          const cases = [
            {
              inputResponses: { other: { action: "accept", content: { approved: true } } },
              requestState: mrtrRequestState
            },
            {
              inputResponses,
              requestState: `${mrtrRequestState}:mismatch`
            }
          ] as const

          for (const [index, continuation] of cases.entries()) {
            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: index + 10,
              method: "tools/call",
              params: {
                name: MrtrToolName,
                arguments: {},
                ...continuation
              }
            })
            const result = yield* test.decodeResult(response).pipe(
              Effect.flatMap((message) => decodeInputRequired(message.result))
            )
            assert.strictEqual(result.requestState, mrtrRequestState)
          }
        }))
    })
  })
