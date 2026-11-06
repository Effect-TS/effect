import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Layer, Option, Queue, Scope } from "effect"
import { McpProtocol, McpServer } from "effect/ai"
import * as HttpRouter from "effect/http/HttpRouter"
import type * as RpcMessage from "effect/rpc/RpcMessage"
import * as RpcServer from "effect/rpc/RpcServer"
import * as TestClock from "effect/testing/TestClock"
import { makeMcpSseReader } from "./TestUtils/McpHttpResponse.ts"
import { type JsonRpcMessage, makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

type TransportEvent = { readonly _tag: "Message"; readonly message: JsonRpcMessage } | { readonly _tag: "Closed" }

const makeHarness = Effect.fnUntraced(function*() {
  const outbound = yield* Queue.unbounded<JsonRpcMessage>()
  const writeRequest = yield* Deferred.make<
    (clientId: number, message: RpcMessage.FromClientEncoded) => Effect.Effect<void>
  >()
  const transportClosed = yield* Deferred.make<void>()
  const blockedWrite = yield* Deferred.make<void>()
  const releaseWrite = yield* Deferred.make<void>()
  const events: Array<TransportEvent> = []
  let blockWrites = false
  let blockResponsesOnly = false
  const protocols = [McpProtocol.v2026_07_28] as const
  const serialization = McpServer.makeSerialization({ protocols, framing: "json" })
  const parser = serialization.makeUnsafe()
  const transport = Layer.effect(RpcServer.Protocol)(Effect.gen(function*() {
    const disconnects = yield* Queue.unbounded<number>()
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => events.push({ _tag: "Closed" })).pipe(
        Effect.andThen(Deferred.succeed(transportClosed, undefined))
      )
    )
    return yield* RpcServer.Protocol.make((write) =>
      Deferred.succeed(writeRequest, write).pipe(Effect.as({
        disconnects,
        send: Effect.fnUntraced(function*(_clientId, response) {
          if (blockWrites && (!blockResponsesOnly || response._tag === "Exit")) {
            yield* Deferred.succeed(blockedWrite, undefined)
            yield* Deferred.await(releaseWrite)
          }
          const encoded = parser.encode(response)
          if (encoded === undefined) return
          const message: JsonRpcMessage = JSON.parse(
            typeof encoded === "string" ? encoded : new TextDecoder().decode(encoded)
          )
          events.push({ _tag: "Message", message })
          yield* Queue.offer(outbound, message)
        }),
        end: () => Effect.void,
        clientIds: Effect.succeed(new Set([0])),
        initialMessage: Effect.succeedNone,
        supportsAck: false,
        supportsTransferables: false,
        supportsSpanPropagation: false,
        supportsNotifications: true,
        codecFor: serialization.codecFor
      }))
    )
  }))
  const serverScope = yield* Scope.make()
  yield* Effect.addFinalizer(() => Scope.close(serverScope, Exit.void))
  // Release a deliberately blocked transport even when an assertion fails.
  yield* Effect.addFinalizer(() => Deferred.succeed(releaseWrite, undefined))
  yield* Scope.provide(
    Layer.build(
      McpServer.layer({
        name: "SubscriptionLifecycle",
        version: "1.0.0",
        protocols
      }).pipe(Layer.provide(transport))
    ),
    serverScope
  )
  const write = yield* Deferred.await(writeRequest)
  const listen = (id: string) =>
    Effect.forEach(
      parser.decode(JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "subscriptions/listen",
        params: {
          notifications: {},
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {}
          }
        }
      })),
      (message) => write(0, message as RpcMessage.FromClientEncoded),
      { discard: true }
    ).pipe(
      Effect.andThen(Queue.take(outbound)),
      Effect.tap((message) =>
        Effect.sync(() => {
          assert.strictEqual(message.method, "notifications/subscriptions/acknowledged")
          assert.strictEqual(
            (message.params as { _meta: Record<string, unknown> })._meta["io.modelcontextprotocol/subscriptionId"],
            id
          )
        })
      )
    )
  return {
    listen,
    close: Scope.close(serverScope, Exit.void),
    blockWrites: Effect.sync(() => {
      blockWrites = true
    }),
    blockResponses: Effect.sync(() => {
      blockWrites = true
      blockResponsesOnly = true
    }),
    blockedWrite: Deferred.await(blockedWrite),
    closed: Deferred.isDone(transportClosed),
    events: Effect.sync(() => Array.from(events))
  }
})

describe("MCP subscription lifecycle", () => {
  // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions#ending-a-subscription
  it.effect("completes every active subscription before closing a custom transport", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      yield* harness.listen("first")
      yield* harness.listen("second")
      yield* harness.close
      const events = yield* harness.events
      assert.strictEqual(events.at(-1)?._tag, "Closed")

      for (const id of ["first", "second"]) {
        const cancellationIndex = events.findIndex((event) =>
          event._tag === "Message" && event.message.method === "notifications/cancelled" &&
          (event.message.params as { requestId?: string } | undefined)?.requestId === id
        )
        const completionIndex = events.findIndex((event) => event._tag === "Message" && event.message.id === id)
        assert.isAtLeast(cancellationIndex, 0)
        assert.isAbove(completionIndex, cancellationIndex)
        assert.isBelow(completionIndex, events.length - 1)
        const cancellation = events[cancellationIndex]
        const completion = events[completionIndex]
        if (cancellation._tag !== "Message" || completion._tag !== "Message") return assert.fail("Expected messages")
        assert.strictEqual(
          (cancellation.message.params as { _meta: Record<string, unknown> })
            ._meta["io.modelcontextprotocol/subscriptionId"],
          id
        )
        assert.strictEqual(
          (completion.message.result as { _meta: Record<string, unknown> })
            ._meta["io.modelcontextprotocol/subscriptionId"],
          id
        )
        assert.deepNestedPropertyVal(completion.message, "result.resultType", "complete")
        assert.notProperty(completion.message, "error")
      }
    }))

  it.effect("bounds shutdown when a custom transport stops accepting subscription messages", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      yield* harness.listen("blocked")
      yield* harness.blockWrites
      const closing = yield* Effect.forkChild(harness.close)
      yield* harness.blockedWrite
      yield* TestClock.adjust("2 seconds")
      assert.isTrue(yield* harness.closed)
      yield* Fiber.join(closing)
    }))

  it.effect("bounds shutdown when a custom transport blocks the final subscription result", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      yield* harness.listen("blocked-result")
      yield* harness.blockResponses
      const closing = yield* Effect.forkChild(harness.close)
      yield* harness.blockedWrite
      yield* TestClock.adjust("2 seconds")
      assert.isTrue(yield* harness.closed)
      yield* Fiber.join(closing)
    }))

  it.effect("completes active subscriptions before closing stdio", () =>
    Effect.gen(function*() {
      const harness = yield* makeMcpStdioHarness(McpProtocol.v2026_07_28)
      const request = yield* harness.startRequest("subscriptions/listen", { notifications: {} }, "closing-stdio")
      const acknowledgment = yield* harness.takeMessage
      assert.strictEqual(acknowledgment.method, "notifications/subscriptions/acknowledged")
      const observed: Array<JsonRpcMessage> = []
      const observe = (message: JsonRpcMessage) =>
        Effect.sync(() => {
          observed.push(message)
        })
      const messages = yield* Effect.all([
        harness.takeMessage.pipe(Effect.tap(observe)),
        request.response.pipe(Effect.tap(observe))
      ], {
        concurrency: "unbounded"
      }).pipe(
        Effect.timeoutOption("1 second"),
        Effect.forkChild
      )
      yield* Fiber.interrupt(harness.serverFiber)
      yield* TestClock.adjust("2 seconds")
      const received = yield* Fiber.join(messages)
      assert.isTrue(Option.isSome(received), JSON.stringify(observed))
      if (Option.isNone(received)) return
      const [cancellation, completion] = received.value
      assert.strictEqual(cancellation.method, "notifications/cancelled")
      assert.deepNestedPropertyVal(cancellation, "params.requestId", request.id)
      assert.strictEqual(completion.id, request.id)
      assert.deepNestedPropertyVal(completion, "result.resultType", "complete")
      assert.notProperty(completion, "error")
    }))

  it.effect("completes active subscriptions before disposing the HTTP handler", () =>
    Effect.gen(function*() {
      const { dispose, handler } = HttpRouter.toWebHandler(
        McpServer.layerHttp({
          name: "SubscriptionLifecycle",
          version: "1.0.0",
          path: "/mcp",
          protocols: [McpProtocol.v2026_07_28]
        }),
        { disableLogger: true }
      )
      yield* Effect.addFinalizer(() => Effect.promise(() => dispose()))
      const response = yield* Effect.promise(() =>
        handler(
          new Request("http://localhost/mcp", {
            method: "POST",
            headers: {
              accept: "application/json, text/event-stream",
              "content-type": "application/json",
              "MCP-Protocol-Version": "2026-07-28",
              "Mcp-Method": "subscriptions/listen"
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "closing-http",
              method: "subscriptions/listen",
              params: {
                notifications: {},
                _meta: {
                  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
                  "io.modelcontextprotocol/clientCapabilities": {}
                }
              }
            })
          })
        )
      )
      const reader = makeMcpSseReader(response)
      yield* Effect.addFinalizer(() => reader.cancel)
      assert.strictEqual((yield* reader.take()).method, "notifications/subscriptions/acknowledged")
      const drain = yield* Effect.forkChild(reader.drain())
      yield* Effect.promise(() => dispose())
      const messages = yield* Fiber.join(drain)
      assert.lengthOf(messages, 2)
      assert.strictEqual(messages[0].method, "notifications/cancelled")
      assert.deepNestedPropertyVal(messages[0], "params.requestId", "closing-http")
      assert.strictEqual(messages[1].id, "closing-http")
      assert.deepNestedPropertyVal(messages[1], "result.resultType", "complete")
      assert.notProperty(messages[1], "error")
    }))
})
