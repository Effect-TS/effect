import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NetAddress from "effect/net/NetAddress"
import * as Queue from "effect/Queue"
import * as RpcServer from "effect/rpc/RpcServer"
import * as Schema from "effect/Schema"
import * as Socket from "effect/socket/Socket"
import * as SocketServer from "effect/socket/SocketServer"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { type JsonRpcMessage, makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

const protocol = McpProtocol.v2026_07_28
const rawState = "private-handler-state:account-483:secret-952"
const metadata = {
  "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
  "io.modelcontextprotocol/clientCapabilities": {}
}
const arguments_ = { first: "one", second: "two" }

const decodeState = Schema.decodeUnknownSync(Schema.Struct({
  result: Schema.Struct({ resultType: Schema.Literal("input_required"), requestState: Schema.String })
}))
const decodeCompleted = Schema.decodeUnknownSync(Schema.Struct({
  result: Schema.Struct({ content: Schema.Array(Schema.Struct({ type: Schema.Literal("text"), text: Schema.String })) })
}))
const decodePromptCompleted = Schema.decodeUnknownSync(Schema.Struct({
  result: Schema.Struct({
    messages: Schema.Array(Schema.Struct({
      role: Schema.Literal("assistant"),
      content: Schema.Struct({ type: Schema.Literal("text"), text: Schema.String })
    }))
  })
}))
const decodeError = Schema.decodeUnknownSync(Schema.Struct({
  error: Schema.Struct({ code: Schema.Number, message: Schema.String })
}))

const makeRegistrations = (invocations: Array<string | undefined>, factoryInvocations: Array<string>) =>
  Layer.effectDiscard(Effect.gen(function*() {
    const server = yield* McpServer.McpServer
    for (const name of ["Stateful", "Other"]) {
      yield* server.addTool({
        tool: new McpSchema.Tool({ name, inputSchema: { type: "object" } }),
        annotations: Context.empty(),
        handle: () => {
          factoryInvocations.push("tools/call")
          return McpSchema.McpRequestContext.useSync((context) => {
            invocations.push(context.requestState)
            return context.requestState === undefined
              ? new McpSchema.InputRequired({ requestState: rawState })
              : new McpSchema.CallToolResult({ content: [{ type: "text", text: context.requestState }] })
          })
        }
      })
    }
    yield* server.addPrompt({
      prompt: new McpSchema.Prompt({
        name: "Stateful",
        arguments: [{ name: "first" }, { name: "second" }]
      }),
      annotations: Context.empty(),
      completions: {},
      handle: () => {
        factoryInvocations.push("prompts/get")
        return McpSchema.McpRequestContext.useSync((context) => {
          invocations.push(context.requestState)
          return context.requestState === undefined
            ? new McpSchema.InputRequired({ requestState: rawState })
            : new McpSchema.GetPromptResult({
              messages: [{ role: "assistant", content: { type: "text", text: context.requestState } }]
            })
        })
      }
    })
    yield* server.addResourceTemplate({
      template: new McpSchema.ResourceTemplate({ name: "Stateful", uriTemplate: "file:///state/{id}" }),
      routerPath: "file:///state/:0",
      annotations: Context.empty(),
      completions: {},
      handle: () => {
        factoryInvocations.push("resources/read")
        return Effect.succeed(McpSchema.ReadResourceResult.make({ contents: [] }))
      }
    })
  }))

type Transport = "stdio" | "http" | "http-request" | "custom-socket"

const makeHarness = Effect.fnUntraced(function*(transport: Transport) {
  const invocations: Array<string | undefined> = []
  const factoryInvocations: Array<string> = []
  const registrations = makeRegistrations(invocations, factoryInvocations)
  let nextId = 1
  const envelope = (method: string, params: Record<string, unknown>, id: string | number) => ({
    jsonrpc: "2.0",
    id,
    method,
    params: {
      ...params,
      _meta: { ...metadata, ...typeof params._meta === "object" && params._meta }
    }
  })
  if (transport === "stdio") {
    const harness = yield* makeMcpStdioHarness(protocol, [protocol], registrations)
    return { invocations, factoryInvocations, send: harness.sendRequest }
  }
  if (transport === "http" || transport === "http-request") {
    const options = { name: "State", version: "1", path: "/mcp" as const, protocols: [protocol] as const }
    const harness = yield* makeHttpHarness(registrations.pipe(
      Layer.provideMerge(
        transport === "http" ? McpServer.layerHttp(options) : McpServer.layerHttpRequestScoped(options)
      )
    ))
    const send = Effect.fnUntraced(function*(
      method: string,
      params: Record<string, unknown>,
      id: string | number = nextId++
    ) {
      const response = yield* harness.post(envelope(method, params, id), {
        "MCP-Protocol-Version": protocol.protocolVersion,
        "Mcp-Method": method,
        ...(typeof params.name === "string"
          ? { "Mcp-Name": params.name }
          : typeof params.uri === "string"
          ? { "Mcp-Name": params.uri }
          : {})
      })
      return (yield* readMcpHttpResponse(response)) as JsonRpcMessage
    })
    return { invocations, factoryInvocations, send }
  }
  const incoming = yield* Queue.unbounded<string>()
  const outgoing = yield* Queue.unbounded<string>()
  const write = (chunk: string | Uint8Array | Socket.CloseEvent) =>
    Socket.isCloseEvent(chunk)
      ? Effect.void
      : Queue.offer(outgoing, typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk))
  const socket = Socket.make({
    reader: Effect.succeed({
      pull: Effect.map(Queue.take(incoming), (chunk) => [chunk] as const),
      upgrade: () => Effect.fail(new Socket.SocketError({ reason: new Socket.SocketUpgradeError({}) }))
    }),
    writer: Effect.succeed({ write, writeAll: (chunks) => Effect.forEach(chunks, write, { discard: true }) })
  })
  const sockets = SocketServer.SocketServer.of({
    address: NetAddress.inetAddressFromStringUnsafe("127.0.0.1:0"),
    run: (handler) => handler(socket).pipe(Effect.orDie, Effect.andThen(Effect.never))
  })
  const customProtocol = yield* RpcServer.makeProtocolSocketServer.pipe(
    Effect.provideService(SocketServer.SocketServer, sockets),
    Effect.provide(McpServer.layerSerialization({ protocols: [protocol] }))
  )
  yield* Layer.build(registrations.pipe(Layer.provideMerge(
    McpServer.layer({ name: "State", version: "1", protocols: [protocol] }).pipe(
      Layer.provide(Layer.succeed(RpcServer.Protocol, customProtocol))
    )
  )))
  const send = Effect.fnUntraced(function*(
    method: string,
    params: Record<string, unknown>,
    id: string | number = nextId++
  ) {
    yield* Queue.offer(incoming, `${JSON.stringify(envelope(method, params, id))}\n`)
    while (true) {
      const message = JSON.parse(yield* Queue.take(outgoing)) as JsonRpcMessage
      if (message.id === id) {
        return message
      }
    }
  })
  return { invocations, factoryInvocations, send }
})

// https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr#server-requirements-basic-workflow
describe("requestState integrity", () => {
  for (const transport of ["stdio", "http", "http-request", "custom-socket"] as const) {
    describe(transport, () => {
      for (const method of ["tools/call", "prompts/get", "resources/read"] as const) {
        it.effect(`rejects invalid state before calling the ${method} effect factory`, () =>
          Effect.gen(function*() {
            const harness = yield* makeHarness(transport)
            const response = yield* harness.send(method, {
              ...(method === "resources/read"
                ? { uri: "file:///state/one" }
                : { name: "Stateful", arguments: arguments_ }),
              requestState: "unsealed-state"
            })
            assert.strictEqual(decodeError(response).error.code, -32602)
            assert.deepStrictEqual(harness.factoryInvocations, [])
          }))
      }

      it.effect("seals handler state before sending it to the client", () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness(transport)
          const first = yield* harness.send("tools/call", { name: "Stateful", arguments: arguments_ })
          const state = decodeState(first).result.requestState
          assert.notStrictEqual(state, rawState)
          assert.notInclude(state, rawState)
          assert.deepStrictEqual(harness.invocations, [undefined])
        }))

      it.effect("seals prompt state and restores it when the prompt is resumed", () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness(transport)
          const first = yield* harness.send("prompts/get", { name: "Stateful", arguments: arguments_ })
          const state = decodeState(first).result.requestState
          assert.notStrictEqual(state, rawState)
          assert.notInclude(state, rawState)
          const next = yield* harness.send("prompts/get", {
            name: "Stateful",
            arguments: arguments_,
            requestState: state
          })
          assert.deepStrictEqual(decodePromptCompleted(next).result.messages, [{
            role: "assistant",
            content: { type: "text", text: rawState }
          }])
          assert.deepStrictEqual(harness.invocations, [undefined, rawState])
        }))

      it.effect("restores the original state on a retry with a new request id and metadata", () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness(transport)
          const first = yield* harness.send("tools/call", { name: "Stateful", arguments: arguments_ }, "first")
          const state = decodeState(first).result.requestState
          const next = yield* harness.send("tools/call", {
            name: "Stateful",
            arguments: arguments_,
            requestState: state,
            _meta: { "example.com/attempt": "second" }
          }, "second")
          assert.strictEqual(next.id, "second")
          assert.deepStrictEqual(decodeCompleted(next).result.content, [{ type: "text", text: rawState }])
          assert.deepStrictEqual(harness.invocations, [undefined, rawState])
        }))

      it.effect("accepts semantically identical argument objects with reordered keys", () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness(transport)
          const first = yield* harness.send("tools/call", { name: "Stateful", arguments: arguments_ })
          const state = decodeState(first).result.requestState
          const next = yield* harness.send("tools/call", {
            name: "Stateful",
            arguments: { second: "two", first: "one" },
            requestState: state
          })
          assert.deepStrictEqual(decodeCompleted(next).result.content, [{ type: "text", text: rawState }])
        }))

      it.effect("accepts reordered keys in nested objects and objects inside arrays", () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness(transport)
          const first = yield* harness.send("tools/call", {
            name: "Stateful",
            arguments: { nested: { first: "one", second: "two" }, items: [{ a: 1, b: 2 }] }
          })
          const state = decodeState(first).result.requestState
          const next = yield* harness.send("tools/call", {
            name: "Stateful",
            arguments: { items: [{ b: 2, a: 1 }], nested: { second: "two", first: "one" } },
            requestState: state
          })
          assert.deepStrictEqual(decodeCompleted(next).result.content, [{ type: "text", text: rawState }])
        }))

      it.effect("rejects reordered array elements before invoking a handler", () =>
        Effect.gen(function*() {
          const harness = yield* makeHarness(transport)
          const first = yield* harness.send("tools/call", {
            name: "Stateful",
            arguments: { ordered: ["first", "second"] }
          })
          const state = decodeState(first).result.requestState
          const next = yield* harness.send("tools/call", {
            name: "Stateful",
            arguments: { ordered: ["second", "first"] },
            requestState: state
          })
          assert.strictEqual(decodeError(next).error.code, -32602)
          assert.deepStrictEqual(harness.invocations, [undefined])
        }))

      const invalid = [
        {
          label: "tampered state",
          method: "tools/call",
          name: "Stateful",
          arguments: arguments_,
          state: (state: string) => `${state}:tampered`
        },
        {
          label: "unsealed state",
          method: "tools/call",
          name: "Stateful",
          arguments: arguments_,
          state: () => rawState
        },
        {
          label: "state from a different tool",
          method: "tools/call",
          name: "Other",
          arguments: arguments_,
          state: (state: string) => state
        },
        {
          label: "state from a different method",
          method: "prompts/get",
          name: "Stateful",
          arguments: arguments_,
          state: (state: string) => state
        },
        {
          label: "changed arguments",
          method: "tools/call",
          name: "Stateful",
          arguments: { ...arguments_, first: "changed" },
          state: (state: string) => state
        },
        {
          label: "additional arguments",
          method: "tools/call",
          name: "Stateful",
          arguments: { ...arguments_, extra: "added" },
          state: (state: string) => state
        }
      ]
      for (const test of invalid) {
        it.effect(`rejects ${test.label} before invoking a handler`, () =>
          Effect.gen(function*() {
            const harness = yield* makeHarness(transport)
            const first = yield* harness.send("tools/call", { name: "Stateful", arguments: arguments_ })
            const state = decodeState(first).result.requestState
            const next = yield* harness.send(test.method, {
              name: test.name,
              arguments: test.arguments,
              requestState: test.state(state)
            })
            assert.strictEqual(decodeError(next).error.code, -32602)
            assert.deepStrictEqual(harness.invocations, [undefined])
          }))
      }
    })
  }
})
