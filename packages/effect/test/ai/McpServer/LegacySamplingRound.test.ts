import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import type { Schema } from "effect"
import { McpProtocol, McpSchema } from "effect/ai"
import * as McpInput from "effect/ai/internal/mcpInput"
import * as McpProtocolInternal from "effect/ai/internal/mcpProtocol"
import { makeMcpTestPeer } from "./McpConformance/McpTestPeer.ts"

const toolUse = { type: "tool_use", id: "inspect", name: "inspect_workspace", input: {} } as const
const text = { type: "text", text: "Workspace inspected" } as const
const incompleteHistory = [{ role: "assistant", content: toolUse }] as const
const completeHistory = [
  ...incompleteHistory,
  { role: "user", content: { type: "tool_result", toolUseId: toolUse.id, content: [text] } }
] as const

const makeRound = Effect.fnUntraced(function*(
  messages: ReadonlyArray<Schema.Json>,
  capabilities: McpSchema.ClientCapabilities = { roots: {}, sampling: { tools: {} } },
  protocol: typeof McpProtocol.v2025_11_25 | typeof McpProtocol.v2025_06_18 = McpProtocol.v2025_11_25
) {
  const peer = yield* makeMcpTestPeer(protocol, {
    capabilities,
    handlers: {
      "roots/list": () => Effect.succeed({ roots: [] }),
      "sampling/createMessage": () => Effect.succeed({ role: "assistant", content: text, model: "test" })
    }
  })
  let acquisitions = 0
  const clientInfo = { name: "SamplingRound", version: "1" }
  const invocation = McpProtocolInternal.invocationFromClient({
    clientId: 1,
    protocolVersion: protocol.protocolVersion,
    clientCapabilities: capabilities,
    clientInfo,
    initializePayload: { protocolVersion: protocol.protocolVersion, capabilities, clientInfo },
    getClient: Effect.sync(() => {
      acquisitions++
      return peer.reverseClient
    })
  })
  const handler = McpSchema.McpRequestContext.useSync((context) =>
    context.inputResponses?.sample === undefined
      ? new McpSchema.InputRequired({
        inputRequests: {
          // An earlier valid operation must remain unsent if a later history is invalid.
          roots: { method: "roots/list" },
          sample: { method: "sampling/createMessage", params: { messages, maxTokens: 128 } }
        }
      })
      : "complete"
  )
  return {
    run: McpInput.resolve(handler, invocation).pipe(
      Effect.provideService(McpSchema.McpRequestContext, invocation.requestContext)
    ),
    requests: peer.requests,
    acquisitions: Effect.sync(() => acquisitions)
  }
})

// https://modelcontextprotocol.io/specification/2025-11-25/client/sampling#tool-use-and-result-balance
describe("Legacy sampling round validation", () => {
  it.effect("rejects an invalid sampling history before sending an earlier roots request", () =>
    Effect.gen(function*() {
      const round = yield* makeRound(incompleteHistory)
      const error = yield* Effect.flip(round.run)
      assert.strictEqual(error.code, McpSchema.INTERNAL_ERROR_CODE)
      // The completed operation is the observation boundary; this snapshot does not wait for a missing message.
      assert.deepStrictEqual(yield* round.requests, [])
      assert.strictEqual(yield* round.acquisitions, 0)
    }))

  it.effect("executes the whole valid roots and sampling round and resumes its handler", () =>
    Effect.gen(function*() {
      const round = yield* makeRound(completeHistory)
      assert.strictEqual(yield* round.run, "complete")
      assert.deepStrictEqual((yield* round.requests).map((request) => request.method), [
        "roots/list",
        "sampling/createMessage"
      ])
      assert.strictEqual(yield* round.acquisitions, 1)
    }))

  it.effect("checks sampling.tools before history validity without sending earlier inputs", () =>
    Effect.gen(function*() {
      const round = yield* makeRound(incompleteHistory, { roots: {}, sampling: {} })
      const error = yield* Effect.flip(round.run)
      assert.strictEqual(error.code, McpSchema.INVALID_PARAMS_ERROR_CODE)
      assert.include(error.message, "sampling.tools")
      assert.deepStrictEqual(yield* round.requests, [])
      assert.strictEqual(yield* round.acquisitions, 0)
    }))

  it.effect("checks dated sampling support before history validity without sending earlier inputs", () =>
    Effect.gen(function*() {
      const round = yield* makeRound(incompleteHistory, { roots: {}, sampling: {} }, McpProtocol.v2025_06_18)
      const error = yield* Effect.flip(round.run)
      assert.strictEqual(error.code, McpSchema.INVALID_PARAMS_ERROR_CODE)
      assert.include(error.message, "not representable by MCP 2025-06-18")
      assert.deepStrictEqual(yield* round.requests, [])
      assert.strictEqual(yield* round.acquisitions, 0)
    }))
})
