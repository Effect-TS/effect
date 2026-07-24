import { assert, describe, it } from "@effect/vitest"
import { Context, Deferred, Effect, Queue } from "effect"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as McpServer from "effect/unstable/ai/McpServer"
import type * as RpcMessage from "effect/unstable/rpc/RpcMessage"
import * as RpcServer from "effect/unstable/rpc/RpcServer"

interface TestClient {
  readonly id: number
  readonly messages: ReadonlyArray<unknown>
  readonly send: (message: RpcMessage.FromClientEncoded) => Effect.Effect<void>
  readonly take: Effect.Effect<unknown>
  readonly disconnect: Effect.Effect<void>
}

const makeHarness = (options?: {
  readonly register?: Effect.Effect<void, never, McpServer.McpServer>
}) =>
  Effect.gen(function*() {
    const server = yield* McpServer.McpServer.make
    if (options?.register) {
      yield* options.register.pipe(Effect.provideService(McpServer.McpServer, server))
    }

    const disconnects = yield* Queue.make<number>()
    const activeClientIds = new Set<number>()
    const clients = new Map<number, {
      readonly messages: Array<unknown>
      readonly outgoing: Queue.Queue<unknown>
    }>()
    let receive = (_clientId: number, _message: RpcMessage.FromClientEncoded): Effect.Effect<void> =>
      Effect.die("MCP test protocol has not started")

    const protocol = yield* RpcServer.Protocol.make((write) =>
      Effect.sync(() => {
        receive = write
        return {
          disconnects,
          send(clientId, message) {
            const client = clients.get(clientId)
            if (!client || !activeClientIds.has(clientId)) return Effect.void
            client.messages.push(message)
            return Queue.offer(client.outgoing, message)
          },
          end(clientId) {
            return Effect.sync(() => {
              activeClientIds.delete(clientId)
            })
          },
          clientIds: Effect.sync(() => new Set(activeClientIds)),
          initialMessage: Effect.succeedNone,
          supportsAck: false,
          supportsTransferables: false,
          supportsSpanPropagation: false
        }
      })
    )

    yield* McpServer.run({
      name: "TestServer",
      version: "1.0.0"
    }).pipe(
      Effect.provideService(McpServer.McpServer, server),
      Effect.provideService(RpcServer.Protocol, protocol),
      Effect.forkScoped
    )

    const connect = (id: number) =>
      Effect.gen(function*() {
        const messages: Array<unknown> = []
        const outgoing = yield* Queue.make<unknown>()
        clients.set(id, { messages, outgoing })
        activeClientIds.add(id)
        return {
          id,
          messages,
          send: (message) => receive(id, message),
          take: Queue.take(outgoing),
          disconnect: Effect.sync(() => {
            activeClientIds.delete(id)
            Queue.offerUnsafe(disconnects, id)
          })
        } satisfies TestClient
      })

    return {
      clientIds: protocol.clientIds,
      connect,
      server
    }
  })

const request = (
  id: string | number,
  tag: string,
  payload: unknown
): RpcMessage.RequestEncoded => ({
  _tag: "Request",
  id,
  tag,
  payload,
  headers: []
})

const initialize = (client: TestClient, protocolVersion: McpServer.ProtocolVersion, id = 1) =>
  Effect.gen(function*() {
    yield* client.send(request(id, "initialize", {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: `Client-${client.id}`, version: "1.0.0" }
    }))
    return yield* client.take
  })

const initialized = (client: TestClient) => client.send(request(0, "notifications/initialized", {}))

const isExit = (message: unknown): message is RpcMessage.ResponseExitEncoded =>
  typeof message === "object" &&
  message !== null &&
  "_tag" in message &&
  message._tag === "Exit" &&
  "requestId" in message &&
  (typeof message.requestId === "string" || typeof message.requestId === "number") &&
  "exit" in message &&
  typeof message.exit === "object" &&
  message.exit !== null &&
  "_tag" in message.exit &&
  (message.exit._tag === "Success" || message.exit._tag === "Failure")

const isNotification = (message: unknown, tag: string): boolean =>
  typeof message === "object" &&
  message !== null &&
  "_tag" in message &&
  message._tag === "Request" &&
  "tag" in message &&
  message.tag === tag

const assertExit = (message: unknown, requestId: string | number): RpcMessage.ResponseExitEncoded => {
  if (!isExit(message)) {
    assert.fail(`Expected an Exit response for request ${requestId}`)
  }
  assert.strictEqual(message.requestId, requestId)
  return message
}

const protocolVersionSuite = (protocolVersion: McpServer.ProtocolVersion) => {
  it.effect("initialize creates negotiated state", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      const client = yield* harness.connect(101)

      const response = assertExit(yield* initialize(client, protocolVersion), 1)

      assert.strictEqual(response.exit._tag, "Success")
      if (response.exit._tag === "Success") {
        assert.deepStrictEqual(response.exit.value, {
          capabilities: { completions: {} },
          protocolVersion,
          serverInfo: { name: "TestServer", version: "1.0.0" }
        })
      }
      assert.strictEqual(harness.server.initializedClients.has(client.id), false)
      assert.deepStrictEqual(yield* harness.clientIds, new Set([101]))
    }))

  it.effect("rejects normal requests before notifications/initialized", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      const client = yield* harness.connect(101)
      yield* initialize(client, protocolVersion)

      yield* client.send(request(2, "tools/list", {}))
      const response = assertExit(yield* client.take, 2)

      assert.strictEqual(response.exit._tag, "Failure")
    }))

  it.effect("initialized marks the stable client operational", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      const client = yield* harness.connect(101)
      yield* initialize(client, protocolVersion)

      yield* initialized(client)
      yield* client.send(request(2, "tools/list", {}))
      const response = assertExit(yield* client.take, 2)

      assert.strictEqual(harness.server.initializedClients.has(101), true)
      assert.strictEqual(response.exit._tag, "Success")
    }))

  it.effect("withholds a queued list-change notification until operational", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      const client = yield* harness.connect(101)

      yield* harness.server.notifications["notifications/tools/list_changed"]({})
      yield* Effect.yieldNow
      assert.strictEqual(client.messages.length, 0)

      yield* initialize(client, protocolVersion)
      assert.strictEqual(
        client.messages.some((message) => isNotification(message, "notifications/tools/list_changed")),
        false
      )

      yield* initialized(client)
      const notification = yield* client.take

      assert.strictEqual(isNotification(notification, "notifications/tools/list_changed"), true)
    }))

  it.effect("delivers each server notification once", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      const client = yield* harness.connect(101)
      yield* initialize(client, protocolVersion)
      yield* initialized(client)

      yield* harness.server.notifications["notifications/message"]({ level: "info", data: "once" })
      const notification = yield* client.take

      assert.strictEqual(isNotification(notification, "notifications/message"), true)
      assert.strictEqual(
        client.messages.filter((message) => isNotification(message, "notifications/message")).length,
        1
      )
    }))

  it.effect("isolates two clients", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      const first = yield* harness.connect(101)
      const second = yield* harness.connect(202)
      yield* initialize(first, protocolVersion)
      yield* initialize(second, protocolVersion)
      yield* initialized(first)
      yield* initialized(second)

      yield* first.send(request(10, "tools/list", {}))
      const response = assertExit(yield* first.take, 10)

      assert.strictEqual(response.exit._tag, "Success")
      assert.strictEqual(second.messages.length, 1)
      assert.deepStrictEqual(yield* harness.clientIds, new Set([101, 202]))
    }))

  it.effect("removes a disconnected client from outgoing eligibility", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      const disconnected = yield* harness.connect(101)
      const active = yield* harness.connect(202)
      yield* initialize(disconnected, protocolVersion)
      yield* initialize(active, protocolVersion)
      yield* initialized(disconnected)
      yield* initialized(active)
      yield* disconnected.disconnect

      yield* harness.server.notifications["notifications/message"]({ level: "info", data: "active only" })
      const notification = yield* active.take

      assert.strictEqual(isNotification(notification, "notifications/message"), true)
      assert.strictEqual(
        disconnected.messages.some((message) => isNotification(message, "notifications/message")),
        false
      )
      assert.deepStrictEqual(yield* harness.clientIds, new Set([202]))
      assert.strictEqual(harness.server.initializedClients.has(101), false)
    }))

  it.effect("rejects duplicate initialize", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      const client = yield* harness.connect(101)
      yield* initialize(client, protocolVersion)

      const response = assertExit(yield* initialize(client, protocolVersion, 2), 2)

      assert.strictEqual(response.exit._tag, "Failure")
    }))

  it.effect("accepts duplicate initialized notifications", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness()
      const client = yield* harness.connect(101)
      yield* initialize(client, protocolVersion)

      yield* initialized(client)
      yield* initialized(client)
      yield* client.send(request(2, "tools/list", {}))
      const response = assertExit(yield* client.take, 2)

      assert.strictEqual(response.exit._tag, "Success")
      assert.deepStrictEqual(Array.from(harness.server.initializedClients), [101])
    }))

  it.effect("notifications/cancelled interrupts a matching in-flight request", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const harness = yield* makeHarness({
        register: Effect.gen(function*() {
          const server = yield* McpServer.McpServer
          yield* server.addTool({
            tool: new McpSchema.Tool({ name: "blocking", inputSchema: { type: "object" } }),
            annotations: Context.empty(),
            handle: () =>
              Deferred.succeed(started, undefined).pipe(
                Effect.andThen(Effect.never),
                Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
              )
          })
        })
      })
      const client = yield* harness.connect(101)
      yield* initialize(client, protocolVersion)
      yield* initialized(client)

      yield* client.send(request(77, "tools/call", { name: "blocking", arguments: {} }))
      yield* Deferred.await(started)
      yield* client.send(request(78, "notifications/cancelled", { requestId: 77, reason: "test" }))

      yield* Deferred.await(interrupted)
      const response = assertExit(yield* client.take, 77)
      assert.strictEqual(response.exit._tag, "Failure")
    }))
}

describe("McpServer connection protocol", () => {
  describe("2025-06-18", () => {
    protocolVersionSuite("2025-06-18")
  })

  describe("2025-11-25", () => {
    protocolVersionSuite("2025-11-25")
  })
})
