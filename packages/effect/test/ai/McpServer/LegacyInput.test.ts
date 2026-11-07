import { assert, describe, it } from "@effect/vitest"
import * as McpInput from "effect/ai/internal/mcpInput"
import * as McpProtocolInternal from "effect/ai/internal/mcpProtocol"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { makeMcpSseReader, readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"
import type { JsonRpcMessage } from "./TestUtils/McpStdioHarness.ts"

const protocols = [
  McpProtocol.v2024_11_05,
  McpProtocol.v2025_03_26,
  McpProtocol.v2025_06_18,
  McpProtocol.v2025_11_25
] as const

const rootsInput = new McpSchema.InputRequired({ inputRequests: { roots: { method: "roots/list" } } })

const formInput = new McpSchema.InputRequired({
  inputRequests: {
    approval: {
      method: "elicitation/create",
      params: {
        message: "Approve",
        requestedSchema: { type: "object", properties: { approved: { type: "boolean" } } }
      }
    }
  }
})

const reverseClient = (overrides: Partial<McpSchema.McpReverseClient> = {}): McpSchema.McpReverseClient => ({
  listRoots: () => Effect.succeed(new McpSchema.ListRootsResult({ roots: [] })),
  createMessage: () => Effect.die("Unexpected sampling request"),
  elicit: () => Effect.die("Unexpected elicitation request"),
  ...overrides
})

const runInput = <A, E, R>(
  handler: Effect.Effect<A, E, R>,
  getClient: McpSchema.McpServerClient["Service"]["getClient"],
  capabilities: McpSchema.ClientCapabilities = { roots: {} }
) => {
  const clientInfo = { name: "test", version: "1" }
  const invocation = McpProtocolInternal.invocationFromClient({
    clientId: 1,
    protocolVersion: "2025-11-25",
    clientCapabilities: capabilities,
    clientInfo,
    initializePayload: { protocolVersion: "2025-11-25", capabilities, clientInfo },
    getClient
  })
  return McpInput.resolve(handler, invocation).pipe(
    Effect.provideService(McpSchema.McpRequestContext, invocation.requestContext)
  )
}

describe("Legacy input requests", () => {
  for (const protocol of protocols) {
    // https://modelcontextprotocol.io/specification/2025-11-25/client/roots
    it.effect(`completes a tool after requesting roots on ${protocol.protocolVersion}`, () =>
      Effect.gen(function*() {
        let invocations = 0
        const registration = Layer.effectDiscard(McpServer.McpServer.use((server) =>
          server.addTool({
            tool: new McpSchema.Tool({ name: "Roots", inputSchema: { type: "object" } }),
            annotations: Context.empty(),
            handle: () =>
              McpSchema.McpRequestContext.useSync((context) => {
                invocations++
                if (context.inputResponses?.workspace === undefined) {
                  return new McpSchema.InputRequired({
                    inputRequests: { workspace: { method: "roots/list" } },
                    requestState: "original-state"
                  })
                }
                assert.strictEqual(context.requestState, "original-state")
                assert.deepStrictEqual(context.inputResponses.workspace, {
                  roots: [{ uri: "file:///workspace" }]
                })
                return new McpSchema.CallToolResult({ content: [{ type: "text", text: "ready" }] })
              })
          })
        ))
        const harness = yield* makeHttpHarness(registration.pipe(Layer.provideMerge(
          makeServerLayer({ name: "LegacyRoots", protocols: [protocol] })
        )))
        const headers = yield* initializeHttpSession(harness, protocol, { roots: {} })
        const response = yield* harness.post({
          jsonrpc: "2.0",
          id: "tool",
          method: "tools/call",
          params: { name: "Roots", arguments: {} }
        }, headers)
        const stream = makeMcpSseReader(response)
        yield* Effect.addFinalizer(() => stream.cancel)
        const request = yield* stream.take()
        assert.strictEqual(request.method, "roots/list")
        const accepted = yield* harness.post({
          jsonrpc: "2.0",
          id: request.id,
          result: { roots: [{ uri: "file:///workspace" }] }
        }, headers)
        assert.strictEqual(accepted.status, 202)
        const result = yield* stream.take()
        assert.strictEqual(result.id, "tool")
        assert.deepStrictEqual(result.result, { content: [{ type: "text", text: "ready" }] })
        assert.strictEqual(invocations, 2)
      }))

    // https://modelcontextprotocol.io/specification/2025-11-25/client/sampling
    it.effect(`completes a prompt after sampling on ${protocol.protocolVersion}`, () =>
      Effect.gen(function*() {
        const registration = Layer.effectDiscard(McpServer.McpServer.use((server) =>
          server.addPrompt({
            prompt: new McpSchema.Prompt({ name: "Draft" }),
            annotations: Context.empty(),
            completions: {},
            handle: () =>
              McpSchema.McpRequestContext.useSync((context) => {
                if (context.inputResponses?.draft === undefined) {
                  return new McpSchema.InputRequired({
                    inputRequests: {
                      draft: {
                        method: "sampling/createMessage",
                        params: {
                          messages: [{ role: "user", content: { type: "text", text: "Draft" } }],
                          maxTokens: 10
                        }
                      }
                    }
                  })
                }
                assert.deepStrictEqual(context.inputResponses.draft, {
                  role: "assistant",
                  content: { type: "text", text: "Drafted" },
                  model: "test"
                })
                return new McpSchema.GetPromptResult({
                  messages: [{ role: "user", content: { type: "text", text: "ready" } }]
                })
              })
          })
        ))
        const harness = yield* makeHttpHarness(registration.pipe(Layer.provideMerge(
          makeServerLayer({ name: "LegacySampling", protocols: [protocol] })
        )))
        const headers = yield* initializeHttpSession(harness, protocol, { sampling: {} })
        const response = yield* harness.post({
          jsonrpc: "2.0",
          id: "prompt",
          method: "prompts/get",
          params: { name: "Draft" }
        }, headers)
        const stream = makeMcpSseReader(response)
        yield* Effect.addFinalizer(() => stream.cancel)
        const request = yield* stream.take()
        assert.strictEqual(request.method, "sampling/createMessage")
        yield* harness.post({
          jsonrpc: "2.0",
          id: request.id,
          result: { role: "assistant", content: { type: "text", text: "Drafted" }, model: "test" }
        }, headers)
        const result = yield* stream.take()
        assert.strictEqual(result.id, "prompt")
        assert.deepStrictEqual(result.result, {
          messages: [{ role: "user", content: { type: "text", text: "ready" } }]
        })
      }))
  }

  it.effect("invokes the tool handler factory again for a legacy continuation", () =>
    Effect.gen(function*() {
      let invocations = 0
      const registration = Layer.effectDiscard(McpServer.McpServer.use((server) =>
        server.addTool({
          tool: new McpSchema.Tool({ name: "Factory", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: () => {
            invocations++
            return Effect.succeed(
              invocations === 1
                ? rootsInput
                : new McpSchema.CallToolResult({ content: [{ type: "text", text: "ready" }] })
            )
          }
        })
      ))
      const protocol = McpProtocol.v2025_11_25
      const harness = yield* makeHttpHarness(registration.pipe(Layer.provideMerge(
        makeServerLayer({ name: "LegacyFactory", protocols: [protocol] })
      )))
      const headers = yield* initializeHttpSession(harness, protocol, { roots: {} })
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: "factory",
        method: "tools/call",
        params: { name: "Factory" }
      }, headers)
      const stream = makeMcpSseReader(response)
      yield* Effect.addFinalizer(() => stream.cancel)
      const request = yield* stream.take()
      assert.strictEqual(request.method, "roots/list")
      yield* harness.post({ jsonrpc: "2.0", id: request.id, result: { roots: [] } }, headers)
      const result = yield* stream.take()
      assert.strictEqual(result.id, "factory")
      assert.deepStrictEqual(result.result, { content: [{ type: "text", text: "ready" }] })
      assert.strictEqual(invocations, 2)
    }))

  for (const protocol of [McpProtocol.v2025_06_18, McpProtocol.v2025_11_25]) {
    // https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation
    it.effect(`bridges form elicitation through the ${protocol.protocolVersion} adapter`, () =>
      Effect.gen(function*() {
        const registration = Layer.effectDiscard(McpServer.McpServer.use((server) =>
          server.addTool({
            tool: new McpSchema.Tool({ name: "Form", inputSchema: { type: "object" } }),
            annotations: Context.empty(),
            handle: () =>
              McpSchema.McpRequestContext.useSync((context) => {
                if (context.inputResponses?.approval === undefined) return formInput
                assert.deepStrictEqual(context.inputResponses.approval, {
                  action: "accept",
                  content: { approved: true }
                })
                return new McpSchema.CallToolResult({ content: [{ type: "text", text: "approved" }] })
              })
          })
        ))
        const harness = yield* makeHttpHarness(registration.pipe(Layer.provideMerge(
          makeServerLayer({ name: "LegacyForm", protocols: [protocol] })
        )))
        const headers = yield* initializeHttpSession(harness, protocol, { elicitation: {} })
        const response = yield* harness.post({
          jsonrpc: "2.0",
          id: "form",
          method: "tools/call",
          params: { name: "Form" }
        }, headers)
        const stream = makeMcpSseReader(response)
        yield* Effect.addFinalizer(() => stream.cancel)
        const request = yield* stream.take()
        assert.strictEqual(request.method, "elicitation/create")
        if (protocol.protocolVersion === "2025-06-18") assert.notProperty(request.params, "mode")
        yield* harness.post({
          jsonrpc: "2.0",
          id: request.id,
          result: { action: "accept", content: { approved: true } }
        }, headers)
        const result = yield* stream.take()
        assert.strictEqual(result.id, "form")
        assert.deepStrictEqual(result.result, { content: [{ type: "text", text: "approved" }] })
      }))
  }

  for (const protocol of [McpProtocol.v2024_11_05, McpProtocol.v2025_03_26, McpProtocol.v2025_06_18]) {
    it.effect(`rejects elicitation features absent from ${protocol.protocolVersion}`, () =>
      Effect.gen(function*() {
        const registration = Layer.effectDiscard(McpServer.McpServer.use((server) =>
          server.addTool({
            tool: new McpSchema.Tool({ name: "Unsupported", inputSchema: { type: "object" } }),
            annotations: Context.empty(),
            handle: () =>
              Effect.succeed(
                protocol.protocolVersion === "2025-06-18"
                  ? new McpSchema.InputRequired({
                    inputRequests: {
                      url: {
                        method: "elicitation/create",
                        params: { mode: "url", message: "Sign in", url: "https://example.com/sign-in" }
                      }
                    }
                  })
                  : formInput
              )
          })
        ))
        const harness = yield* makeHttpHarness(registration.pipe(Layer.provideMerge(
          makeServerLayer({ name: "LegacyUnsupported", protocols: [protocol] })
        )))
        const headers = yield* initializeHttpSession(harness, protocol, { elicitation: {} })
        const response = yield* harness.post({
          jsonrpc: "2.0",
          id: "unsupported",
          method: "tools/call",
          params: { name: "Unsupported" }
        }, headers)
        assert.match(response.headers.get("content-type") ?? "", /^application\/json/)
        const message = yield* readMcpHttpResponse(response).pipe(Effect.flatMap(Schema.decodeUnknownEffect(
          Schema.Struct({ id: Schema.String, error: Schema.Struct({ code: Schema.Number }) })
        )))
        assert.strictEqual(message.id, "unsupported")
        assert.strictEqual(message.error.code, -32602)
      }))
  }

  for (const action of ["accept", "decline", "cancel"] as const) {
    // https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation#response-actions
    it.effect(`preserves the ${action} elicitation action for the resumed handler`, () =>
      Effect.gen(function*() {
        const result = yield* runInput(
          McpSchema.McpRequestContext.useSync((context) => context.inputResponses?.approval?.action ?? formInput),
          Effect.succeed(reverseClient({
            elicit: () => Schema.decodeUnknownEffect(McpSchema.Elicit.successSchema)({ action }).pipe(Effect.orDie)
          })),
          { elicitation: {} }
        )
        assert.strictEqual(result, action)
      }))
  }

  it.effect("validates the entire input round before sending a reverse request", () =>
    Effect.gen(function*() {
      let sent = 0
      const error = yield* runInput(
        Effect.succeed(
          new McpSchema.InputRequired({
            inputRequests: {
              roots: { method: "roots/list" },
              malformed: { method: "sampling/createMessage", params: { maxTokens: "invalid" } }
            }
          })
        ),
        Effect.succeed(reverseClient({
          listRoots: () =>
            Effect.sync(() => {
              sent++
              return new McpSchema.ListRootsResult({ roots: [] })
            })
        })),
        { roots: {}, sampling: {} }
      ).pipe(Effect.flip)
      assert.strictEqual(error.code, -32602)
      assert.strictEqual(sent, 0)
    }))

  it.effect("rejects an unadvertised capability before sending earlier inputs in the round", () =>
    Effect.gen(function*() {
      let acquired = false
      const error = yield* runInput(
        Effect.succeed(
          new McpSchema.InputRequired({
            inputRequests: { roots: { method: "roots/list" }, approval: formInput.inputRequests!.approval }
          })
        ),
        Effect.sync(() => {
          acquired = true
          return reverseClient()
        })
      ).pipe(Effect.flip)
      assert.strictEqual(error.code, -32602)
      assert.strictEqual(acquired, false)
    }))

  // https://modelcontextprotocol.io/specification/2025-11-25/client/sampling#tool-use-and-result-balance
  it.effect("validates a later sampling history before sending earlier inputs in the round", () =>
    Effect.gen(function*() {
      const protocol = McpProtocol.v2025_11_25
      const text = { type: "text", text: "Inspected" } as const
      const toolUse = { role: "assistant", content: { type: "tool_use", id: "inspect", name: "inspect", input: {} } }
      const histories = {
        Invalid: [toolUse],
        Valid: [toolUse, { role: "user", content: { type: "tool_result", toolUseId: "inspect", content: [text] } }]
      } as const
      const registration = Layer.effectDiscard(
        Effect.forEach(
          Object.entries(histories),
          ([name, messages]) =>
            McpServer.McpServer.use((server) =>
              server.addTool({
                tool: new McpSchema.Tool({ name, inputSchema: { type: "object" } }),
                annotations: Context.empty(),
                handle: () =>
                  McpSchema.McpRequestContext.useSync((context) =>
                    context.inputResponses?.sample === undefined
                      ? new McpSchema.InputRequired({
                        inputRequests: {
                          roots: { method: "roots/list" },
                          sample: { method: "sampling/createMessage", params: { messages, maxTokens: 10 } }
                        }
                      })
                      : new McpSchema.CallToolResult({ content: [text] })
                  )
              })
            )
        )
      )
      const harness = yield* makeHttpHarness(registration.pipe(Layer.provideMerge(
        makeServerLayer({ name: "LegacySamplingRound", protocols: [protocol] })
      )))
      const call = (name: keyof typeof histories, headers: Record<string, string>) =>
        harness.post({ jsonrpc: "2.0", id: name, method: "tools/call", params: { name, arguments: {} } }, headers)
      const messages = (response: Response) =>
        response.headers.get("content-type")?.includes("text/event-stream")
          ? makeMcpSseReader(response).drain()
          : Effect.promise<JsonRpcMessage>(() => response.json()).pipe(Effect.map((message) => [message]))

      // Missing sampling.tools is reported before the history; an invalid history is a server error.
      for (
        const [sampling, code] of [[{}, -32602], [{ tools: {} }, -32603]] as const
      ) {
        const headers = yield* initializeHttpSession(harness, protocol, { roots: {}, sampling })
        const sent = yield* messages(yield* call("Invalid", headers))
        assert.strictEqual(sent.length, 1)
        assert.strictEqual(sent[0].id, "Invalid")
        assert.strictEqual(Schema.decodeUnknownSync(McpSchema.McpError)(sent[0].error).code, code)
      }

      const headers = yield* initializeHttpSession(harness, protocol, { roots: {}, sampling: { tools: {} } })
      const stream = makeMcpSseReader(yield* call("Valid", headers))
      yield* Effect.addFinalizer(() => stream.cancel)
      const methods: Array<string | undefined> = []
      for (let i = 0; i < 2; i++) {
        const request = yield* stream.take()
        methods.push(request.method)
        yield* harness.post({
          jsonrpc: "2.0",
          id: request.id,
          result: request.method === "roots/list"
            ? { roots: [] }
            : { role: "assistant", content: text, model: "test" }
        }, headers)
      }
      assert.deepStrictEqual(methods.sort(), ["roots/list", "sampling/createMessage"])
      const result = yield* stream.take()
      assert.strictEqual(result.id, "Valid")
      assert.deepStrictEqual(result.result, { content: [text] })
    }))

  it.effect("replaces previous input responses and clears omitted state on the next round", () =>
    Effect.gen(function*() {
      const contexts: Array<McpSchema.McpRequestContext["Service"]> = []
      const result = yield* runInput(
        McpSchema.McpRequestContext.useSync((context) => {
          contexts.push(context)
          if (contexts.length === 1) {
            return new McpSchema.InputRequired({
              requestState: "first",
              inputRequests: { first: { method: "roots/list" } }
            })
          }
          if (contexts.length === 2) {
            return new McpSchema.InputRequired({ inputRequests: { second: { method: "roots/list" } } })
          }
          return "done"
        }),
        Effect.succeed(reverseClient())
      )
      assert.strictEqual(result, "done")
      assert.strictEqual(contexts[1].requestState, "first")
      assert.deepStrictEqual(Object.keys(contexts[1].inputResponses!), ["first"])
      assert.strictEqual(contexts[2].requestState, undefined)
      assert.deepStrictEqual(Object.keys(contexts[2].inputResponses!), ["second"])
    }))

  it.effect("preserves sampling images through the canonical reverse client codecs", () =>
    Effect.gen(function*() {
      const result = yield* runInput(
        McpSchema.McpRequestContext.useSync((context) =>
          context.inputResponses?.image ?? new McpSchema.InputRequired({
            inputRequests: {
              image: {
                method: "sampling/createMessage",
                params: {
                  messages: [{ role: "user", content: { type: "image", data: "AQID", mimeType: "image/png" } }],
                  maxTokens: 10
                }
              }
            }
          })
        ),
        Effect.succeed(reverseClient({
          createMessage: (request) => {
            assert.deepStrictEqual(request.messages[0].content, {
              type: "image",
              data: new Uint8Array([1, 2, 3]),
              mimeType: "image/png"
            })
            return Effect.succeed(
              new McpSchema.CreateMessageResult({
                role: "assistant",
                content: { type: "image", data: new Uint8Array([4, 5, 6]), mimeType: "image/png" },
                model: "test"
              })
            )
          }
        })),
        { sampling: {} }
      )
      assert.deepStrictEqual(result, {
        role: "assistant",
        content: { type: "image", data: "BAUG", mimeType: "image/png" },
        model: "test"
      })
    }))

  // https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation#url-mode-elicitation-requests
  it.effect("assigns an elicitation identifier when bridging a URL request", () =>
    Effect.gen(function*() {
      const ids: Array<string> = []
      const result = yield* runInput(
        McpSchema.McpRequestContext.useSync((context) =>
          context.inputResponses?.url?.action ?? new McpSchema.InputRequired({
            inputRequests: {
              url: {
                method: "elicitation/create",
                params: { mode: "url", message: "Sign in", url: "https://example.com/sign-in" }
              }
            }
          })
        ),
        Effect.succeed(reverseClient({
          elicit: (request) => {
            assert.strictEqual(request.mode, "url")
            if (request.mode === "url") ids.push(request.elicitationId)
            return Effect.succeed(new McpSchema.ElicitAcceptResult({ action: "accept" }))
          }
        })),
        { elicitation: { url: {} } }
      )
      assert.strictEqual(result, "accept")
      assert.strictEqual(ids.length, 1)
      assert.match(ids[0], /^[0-9a-f-]{36}$/)
    }))

  it.effect("rejects state-only input instead of looping or acquiring a client", () =>
    Effect.gen(function*() {
      const error = yield* runInput(
        Effect.succeed(new McpSchema.InputRequired({ requestState: "pending" })),
        Effect.die("State-only input must not acquire a reverse client")
      ).pipe(Effect.flip)
      assert.strictEqual(error.code, -32602)
      assert.match(error.message, /State-only/)
    }))

  it.effect("bounds repeated input rounds and releases the scoped reverse client", () =>
    Effect.gen(function*() {
      let calls = 0
      let released = false
      const error = yield* runInput(
        Effect.succeed(rootsInput),
        Effect.acquireRelease(
          Effect.succeed(reverseClient({
            listRoots: () =>
              Effect.sync(() => {
                calls++
                return new McpSchema.ListRootsResult({ roots: [] })
              })
          })),
          () =>
            Effect.sync(() => {
              released = true
            })
        )
      ).pipe(Effect.provideService(McpInput.MaxRounds, 2), Effect.flip)
      assert.strictEqual(error.code, -32602)
      assert.strictEqual(calls, 2)
      assert.strictEqual(released, true)
    }))

  // https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#timeouts
  it.effect("times out input requests and interrupts the pending reverse operation", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      let interrupted = false
      const fiber = yield* runInput(
        Effect.succeed(rootsInput),
        Effect.succeed(reverseClient({
          listRoots: () =>
            Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() =>
                Effect.sync(() => {
                  interrupted = true
                })
              )
            )
        }))
      ).pipe(Effect.provideService(McpInput.InputTimeout, "1 second"), Effect.flip, Effect.forkChild)
      yield* Deferred.await(started)
      yield* TestClock.adjust("1 second")
      const error = yield* Fiber.join(fiber)
      assert.strictEqual(error.code, -32603)
      assert.match(error.message, /timed out/)
      assert.strictEqual(interrupted, true)
    }))

  // https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/cancellation#behavior-requirements
  it.effect("preserves cancellation and releases a pending reverse client's scope", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      let released = false
      const fiber = yield* runInput(
        Effect.succeed(rootsInput),
        Effect.acquireRelease(
          Effect.succeed(reverseClient({
            listRoots: () => Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never))
          })),
          () =>
            Effect.sync(() => {
              released = true
            })
        )
      ).pipe(Effect.forkChild)
      yield* Deferred.await(started)
      yield* Fiber.interrupt(fiber)
      assert.strictEqual(released, true)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(fiber)))
    }))

  it.effect("keeps invalid continuation input as a protocol error", () =>
    Effect.gen(function*() {
      const error = yield* runInput(
        McpSchema.McpRequestContext.use((context) =>
          context.inputResponses === undefined
            ? Effect.succeed(rootsInput)
            : Effect.fail(new McpSchema.InvalidParams({ message: "Invalid continuation" }))
        ),
        Effect.succeed(reverseClient())
      ).pipe(Effect.flip)
      assert.strictEqual(error._tag, "RequestRejected")
      assert.strictEqual(error.code, -32602)
      assert.strictEqual(error.message, "Invalid continuation")
    }))

  it.effect("does not expose the reverse client's internal failure", () =>
    Effect.gen(function*() {
      const error = yield* runInput(
        Effect.succeed(rootsInput),
        Effect.succeed(reverseClient({
          listRoots: () =>
            Effect.fail(
              new McpSchema.McpReverseOperationError({
                operation: "roots/list",
                cause: new Error("private connection details")
              })
            )
        }))
      ).pipe(Effect.flip)
      assert.strictEqual(error.code, -32603)
      assert.strictEqual(error.message, "MCP client input request failed")
      assert.strictEqual(error.data, undefined)
    }))

  for (
    const options of [
      { maxRounds: 0, timeout: "1 second" as const },
      { maxRounds: 1.5, timeout: "1 second" as const },
      { maxRounds: 1, timeout: "0 seconds" as const },
      { maxRounds: 1, timeout: "Infinity" as const }
    ]
  ) {
    it.effect(`rejects invalid input limits ${options.maxRounds}/${options.timeout}`, () =>
      Effect.gen(function*() {
        const error = yield* runInput(
          Effect.succeed(rootsInput),
          Effect.die("Invalid limits must not acquire the reverse client")
        ).pipe(
          Effect.provideService(McpInput.MaxRounds, options.maxRounds),
          Effect.provideService(McpInput.InputTimeout, options.timeout),
          Effect.flip
        )
        assert.strictEqual(error.code, -32603)
      }))
  }

  it.effect("does not evaluate legacy input limits for a completed handler", () =>
    Effect.gen(function*() {
      const result = yield* runInput(
        Effect.succeed("ready"),
        Effect.die("Completed handlers must not acquire a reverse client")
      ).pipe(Effect.provideService(McpInput.MaxRounds, 0))
      assert.strictEqual(result, "ready")
    }))

  it.effect("leaves modern input requirements to the stateless protocol adapter", () =>
    Effect.gen(function*() {
      const invocation = McpProtocolInternal.invocationFromRequestContext({
        clientId: 1,
        protocolVersion: "2026-07-28",
        clientCapabilities: { roots: {} }
      })
      const result = yield* McpInput.resolve(Effect.succeed(rootsInput), invocation).pipe(
        Effect.provideService(McpInput.MaxRounds, 0)
      )
      assert.strictEqual(result, rootsInput)
    }))

  // https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/cancellation#behavior-requirements
  it.effect("cancels the reverse HTTP request when the original tool call is cancelled", () =>
    Effect.gen(function*() {
      const registration = Layer.effectDiscard(McpServer.McpServer.use((server) =>
        server.addTool({
          tool: new McpSchema.Tool({ name: "Wait", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: () => Effect.succeed(rootsInput)
        })
      ))
      const protocol = McpProtocol.v2025_11_25
      const harness = yield* makeHttpHarness(registration.pipe(Layer.provideMerge(
        makeServerLayer({ name: "LegacyCancellation", protocols: [protocol] })
      )))
      const headers = yield* initializeHttpSession(harness, protocol, { roots: {} })
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: "cancel-tool",
        method: "tools/call",
        params: { name: "Wait" }
      }, headers)
      const stream = makeMcpSseReader(response)
      yield* Effect.addFinalizer(() => stream.cancel)
      const reverse = yield* stream.take()
      assert.strictEqual(reverse.method, "roots/list")
      const cancellation = yield* harness.post({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: "cancel-tool" }
      }, headers)
      assert.strictEqual(cancellation.status, 202)
      const remaining = yield* stream.drain()
      assert.deepStrictEqual(remaining.map((message) => message.method), ["notifications/cancelled"])
      assert.propertyVal(remaining[0].params, "requestId", reverse.id)
      assert.isFalse(remaining.some((message) => message.id === "cancel-tool"))
    }))

  it.effect("keeps the middleware timeout and finalizer around the complete input loop", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      let finalized = 0
      let interrupted = false
      const middleware = McpServer.middleware()((effect) =>
        effect.pipe(
          Effect.timeoutOrElse({
            duration: "1 second",
            orElse: () => Effect.fail(new McpSchema.InternalError({ message: "Middleware deadline" }))
          }),
          Effect.ensuring(Effect.sync(() => {
            finalized++
          }))
        )
      )
      const services = yield* Layer.build(middleware.layer)
      const server = Context.get(yield* Layer.build(McpServer.McpServer.layer), McpServer.McpServer)
      yield* server.addTool({
        tool: new McpSchema.Tool({ name: "Wait", inputSchema: { type: "object" } }),
        annotations: Context.empty(),
        services,
        handle: () => Effect.succeed(rootsInput)
      })
      const clientInfo = { name: "test", version: "1" }
      const client = McpSchema.McpServerClient.of({
        clientId: 1,
        protocolVersion: "2025-11-25",
        clientCapabilities: { roots: {} },
        clientInfo,
        initializePayload: { protocolVersion: "2025-11-25", capabilities: { roots: {} }, clientInfo },
        getClient: Effect.succeed(reverseClient({
          listRoots: () =>
            Deferred.succeed(started, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() =>
                Effect.sync(() => {
                  interrupted = true
                })
              )
            )
        }))
      })
      const fiber = yield* server.callTool({ name: "Wait" }).pipe(
        Effect.provideService(McpSchema.McpServerClient, client),
        Effect.flip,
        Effect.forkChild
      )
      yield* Deferred.await(started)
      yield* TestClock.adjust("1 second")
      const error = yield* Fiber.join(fiber)
      assert.strictEqual(error.message, "Middleware deadline")
      assert.strictEqual(finalized, 1)
      assert.strictEqual(interrupted, true)
    }))
})
