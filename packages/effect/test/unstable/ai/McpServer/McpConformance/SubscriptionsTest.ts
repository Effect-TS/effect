import { assert, describe, it } from "@effect/vitest"
import type * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as PubSub from "effect/PubSub"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as McpCore from "effect/unstable/ai/internal/mcpCore"
import type * as McpProtocolInternal from "effect/unstable/ai/internal/mcpProtocol"
import * as McpProtocol2026 from "effect/unstable/ai/internal/mcpProtocol/v2026_07_28"
import * as McpSchema2026 from "effect/unstable/ai/internal/mcpSchema/v2026_07_28"
import * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as McpServer from "effect/unstable/ai/McpServer"
import * as Rpc from "effect/unstable/rpc/Rpc"
import type * as RpcMessage from "effect/unstable/rpc/RpcMessage"
import { RequestId } from "effect/unstable/rpc/RpcMessage"
import type * as RpcSerialization from "effect/unstable/rpc/RpcSerialization"
import * as RpcServer from "effect/unstable/rpc/RpcServer"
import { makeHttpHarness } from "../TestUtils/McpHttpHarness.ts"
import { makeServerLayer } from "../TestUtils/McpServerLayer.ts"
import { type JsonRpcMessage, makeMcpStdioHarness, type McpStdioHarness } from "../TestUtils/McpStdioHarness.ts"
import { McpConformance, type McpConformanceLayer } from "./McpConformance.ts"

const subscriptionIdKey = "io.modelcontextprotocol/subscriptionId"

const paramsOf = (message: JsonRpcMessage): Record<string, unknown> => {
  assert.isObject(message.params)
  return message.params as Record<string, unknown>
}

const subscriptionIdOf = (message: JsonRpcMessage): string | number => {
  const params = paramsOf(message)
  assert.isObject(params._meta)
  const subscriptionId = (params._meta as Record<string, unknown>)[subscriptionIdKey]
  if (typeof subscriptionId === "string" || typeof subscriptionId === "number") {
    return subscriptionId
  }
  return assert.fail("Expected a string or numeric subscription identifier")
}

const makeTool = (name: string) => ({
  tool: new McpSchema.Tool({ name, inputSchema: { type: "object", properties: {} } }),
  annotations: Context.empty(),
  handle: () => Effect.succeed(new McpSchema.CallToolResult({ content: [] }))
})

const makePrompt = (name: string) => ({
  prompt: new McpSchema.Prompt({ name }),
  annotations: Context.empty(),
  completions: {},
  handle: () =>
    Effect.succeed(
      new McpSchema.GetPromptResult({
        messages: [{ role: "user", content: { type: "text", text: name } }]
      })
    )
})

const makeResource = (uri: string) => ({
  resource: new McpSchema.Resource({ uri, name: uri }),
  annotations: Context.empty(),
  handle: Effect.succeed(McpSchema.ReadResourceResult.make({ contents: [] }))
})

const subscriptionRegistrations = Layer.effectDiscard(
  Effect.gen(function*() {
    const server = yield* McpServer.McpServer
    yield* server.addTool(makeTool("subscription-registration-tool"))
    yield* server.addPrompt(makePrompt("subscription-registration-prompt"))
    yield* server.addResource(makeResource("file:///subscription-registration-resource"))
  })
)

const toolOnlyRegistration = Layer.effectDiscard(
  McpServer.McpServer.use((server) => server.addTool(makeTool("tool-only-registration")))
)

const makeSubscriptionHarness = (
  protocol: McpProtocol.ProtocolAdapter,
  protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter> = [protocol]
) => makeMcpStdioHarness(protocol, protocols, subscriptionRegistrations)

const listen = (
  fixture: McpStdioHarness,
  id: string | number,
  notifications: Record<string, unknown>
) =>
  fixture.flushListChanged.pipe(
    Effect.andThen(fixture.startRequest("subscriptions/listen", { notifications }, id))
  )

const assertAcknowledged = (
  message: JsonRpcMessage,
  id: string | number,
  notifications: Record<string, unknown>
) => {
  assert.strictEqual(message.method, "notifications/subscriptions/acknowledged")
  assert.notProperty(message, "id")
  assert.strictEqual(subscriptionIdOf(message), id)
  assert.deepStrictEqual(paramsOf(message).notifications, notifications)
}

const makeSseReader = (response: Response) => {
  assert.match(response.headers.get("content-type") ?? "", /^text\/event-stream(?:;|$)/)
  const body = response.body
  assert.isNotNull(body)
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let pending = ""
  const take = Effect.fnUntraced(function*() {
    while (true) {
      const boundary = pending.indexOf("\n\n")
      if (boundary !== -1) {
        const event = pending.slice(0, boundary)
        pending = pending.slice(boundary + 2)
        const data = event.split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n")
        if (data.length > 0) {
          return JSON.parse(data) as JsonRpcMessage
        }
        continue
      }
      const chunk = yield* Effect.promise(() => reader.read())
      assert.isFalse(chunk.done)
      pending += decoder.decode(chunk.value, { stream: true }).replaceAll("\r\n", "\n")
    }
  })
  return {
    take,
    cancel: Effect.promise(() => reader.cancel())
  }
}

const httpMetadata = (protocol: McpProtocol.ProtocolAdapter) => ({
  "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": { name: "subscription-http-client", version: "1.0.0" }
})

const httpListenRequest = (protocol: McpProtocol.ProtocolAdapter, id: string | number) => ({
  jsonrpc: "2.0",
  id,
  method: "subscriptions/listen",
  params: {
    notifications: { toolsListChanged: true },
    _meta: httpMetadata(protocol)
  }
})

const httpHeaders = (protocol: McpProtocol.ProtocolAdapter): HeadersInit => ({
  "MCP-Protocol-Version": protocol.protocolVersion,
  "Mcp-Method": "subscriptions/listen"
})

const makeHttpSubscriptionHarness = Effect.fnUntraced(function*(protocol: McpProtocol.ProtocolAdapter) {
  const serverReady = yield* Deferred.make<McpServer.McpServer["Service"]>()
  const registrations = Layer.effectDiscard(
    Effect.gen(function*() {
      const server = yield* McpServer.McpServer
      yield* server.addTool(makeTool("http-subscription-baseline"))
      yield* Deferred.succeed(serverReady, server)
    })
  )
  const harness = yield* makeHttpHarness(
    registrations.pipe(Layer.provideMerge(makeServerLayer({
      name: "SubscriptionConformance",
      protocols: [protocol]
    })))
  )
  return { harness, serverReady }
})

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: McpConformanceLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Subscriptions", () => {
      // SEP-2575 replaces unsolicited list-change notifications and resources/subscribe with subscriptions/listen.
      // https://modelcontextprotocol.io/seps/2575-stateless-mcp
      // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions
      it.effect("should advertise supported subscription capabilities when features are registered", () =>
        Effect.gen(function*() {
          const test = yield* McpConformance
          const discovered = yield* test.initialize({ server: "features" })

          assert.deepStrictEqual(discovered.message.result.capabilities.tools, { listChanged: true })
          assert.deepStrictEqual(discovered.message.result.capabilities.resources, {
            listChanged: true,
            subscribe: true
          })
          assert.deepStrictEqual(discovered.message.result.capabilities.prompts, { listChanged: true })
        }))

      it.effect("should not advertise subscriptions and should reject listen when the transport cannot send notifications", () =>
        Effect.gen(function*() {
          const outbound = yield* Queue.unbounded<RpcMessage.FromServerEncoded>()
          const disconnects = yield* Queue.unbounded<number>()
          const writeRequest = yield* Deferred.make<
            (clientId: number, message: RpcMessage.FromClientEncoded) => Effect.Effect<void>
          >()
          const transport = yield* RpcServer.Protocol.make((write) =>
            Deferred.succeed(writeRequest, write).pipe(
              Effect.as({
                disconnects,
                send: (_clientId, message) => Queue.offer(outbound, message).pipe(Effect.asVoid),
                end: (_clientId) => Effect.void,
                clientIds: Effect.succeed(new Set([0])),
                initialMessage: Effect.succeedNone,
                supportsAck: false,
                supportsTransferables: false,
                supportsSpanPropagation: false,
                supportsNotifications: false,
                codecFor: Schema.toCodecJson as RpcSerialization.CodecFor
              })
            )
          )
          yield* Effect.gen(function*() {
            yield* Layer.build(
              subscriptionRegistrations.pipe(
                Layer.provideMerge(
                  McpServer.layer({
                    name: "SubscriptionConformance",
                    version: "1.0.0",
                    protocols: [protocol]
                  }).pipe(Layer.provide(Layer.succeed(RpcServer.Protocol, transport)))
                )
              )
            )
            return yield* Effect.never
          }).pipe(Effect.scoped, Effect.forkScoped)
          const send = yield* Deferred.await(writeRequest)
          const metadata = httpMetadata(protocol)

          yield* send(0, {
            _tag: "Request",
            id: 1,
            tag: "server/discover",
            payload: { _meta: metadata },
            headers: []
          })
          const discovery = yield* Queue.take(outbound)
          if (discovery._tag !== "Exit" || discovery.exit._tag !== "Success") {
            return assert.fail("Expected successful discovery response")
          }
          assert(Predicate.isObject(discovery.exit.value))
          assert(Predicate.isObject(discovery.exit.value.capabilities))
          assert.deepStrictEqual(discovery.exit.value.capabilities.tools, { listChanged: false })
          assert.deepStrictEqual(discovery.exit.value.capabilities.resources, {
            listChanged: false,
            subscribe: false
          })
          assert.deepStrictEqual(discovery.exit.value.capabilities.prompts, { listChanged: false })

          yield* send(0, {
            _tag: "Request",
            id: 2,
            tag: "subscriptions/listen",
            payload: { notifications: { toolsListChanged: true }, _meta: metadata },
            headers: []
          })
          const listenResponse = yield* Queue.take(outbound)
          if (listenResponse._tag !== "Exit" || listenResponse.exit._tag !== "Failure") {
            return assert.fail("Expected failed subscription response")
          }
          const failure = listenResponse.exit.cause.find((cause) => cause._tag === "Fail")
          assert(failure !== undefined && failure._tag === "Fail")
          assert(Predicate.isObject(failure.error))
          assert.strictEqual(failure.error.code, McpSchema.METHOD_NOT_FOUND_ERROR_CODE)
        }))

      it.effect("should buffer matching events while the subscription acknowledgment is blocked", () =>
        Effect.gen(function*() {
          const core = yield* McpCore.make
          const events = yield* PubSub.unbounded<McpProtocolInternal.CanonicalServerNotification>()
          const released = yield* Deferred.make<void>()
          const acknowledgmentStarted = yield* Deferred.make<void>()
          const releaseAcknowledgment = yield* Deferred.make<void>()
          const sent = yield* Queue.unbounded<McpProtocol.ProjectedNotification>()
          const handlers = McpProtocol2026.makeHandlers(core, undefined, {
            subscribeServerNotifications: Effect.acquireRelease(
              PubSub.subscribe(events),
              () => Deferred.succeed(released, undefined)
            ),
            sendNotification: (_protocolVersion, _clientId, notification) =>
              Effect.gen(function*() {
                if (notification.tag === McpSchema2026.SubscriptionsAcknowledgedNotification._tag) {
                  yield* Deferred.succeed(acknowledgmentStarted, undefined)
                  yield* Deferred.await(releaseAcknowledgment)
                }
                yield* Queue.offer(sent, notification)
              }),
            supportedVersions: [McpSchema2026.protocolVersion],
            serverInfo: { name: "SubscriptionConformance", version: "1.0.0" },
            registrationPresence: { tools: true, resources: false, prompts: false }
          })
          const listener = yield* handlers["subscriptions/listen"](
            { notifications: { toolsListChanged: true }, _meta: httpMetadata(protocol) },
            { client: new Rpc.ServerClient(1), requestId: RequestId("blocked-acknowledgment") }
          ).pipe(Effect.scoped, Effect.forkScoped)

          yield* Deferred.await(acknowledgmentStarted)
          yield* PubSub.publish(events, {
            notification: McpCore.ServerNotification.ToolsChanged({})
          })
          yield* Deferred.succeed(releaseAcknowledgment, undefined)

          const acknowledgment = yield* Queue.take(sent)
          const notification = yield* Queue.take(sent)
          assert.strictEqual(acknowledgment.tag, McpSchema2026.SubscriptionsAcknowledgedNotification._tag)
          assert.strictEqual(notification.tag, McpSchema2026.ToolListChangedNotification._tag)

          yield* Fiber.interrupt(listener)
          yield* Deferred.await(released)
        }))

      it.effect("should release the scoped subscription when a blocked listener is interrupted", () =>
        Effect.gen(function*() {
          const core = yield* McpCore.make
          const events = yield* PubSub.unbounded<McpProtocolInternal.CanonicalServerNotification>()
          const released = yield* Deferred.make<void>()
          const waitingForEvent = yield* Deferred.make<void>()
          const handlers = McpProtocol2026.makeHandlers(core, undefined, {
            subscribeServerNotifications: Effect.acquireRelease(
              PubSub.subscribe(events).pipe(
                Effect.map((subscription) =>
                  new Proxy(subscription, {
                    get(target, property, receiver) {
                      if (property !== "subscription") {
                        return Reflect.get(target, property, receiver)
                      }
                      return new Proxy(target.subscription, {
                        get(backing, backingProperty, backingReceiver) {
                          if (backingProperty !== "poll") {
                            return Reflect.get(backing, backingProperty, backingReceiver)
                          }
                          return () => {
                            Deferred.doneUnsafe(waitingForEvent, Effect.void)
                            return backing.poll()
                          }
                        }
                      })
                    }
                  })
                )
              ),
              () => Deferred.succeed(released, undefined)
            ),
            sendNotification: () => Effect.void,
            supportedVersions: [McpSchema2026.protocolVersion],
            serverInfo: { name: "SubscriptionConformance", version: "1.0.0" },
            registrationPresence: { tools: true, resources: false, prompts: false }
          })
          const listener = yield* handlers["subscriptions/listen"](
            { notifications: { toolsListChanged: true }, _meta: httpMetadata(protocol) },
            { client: new Rpc.ServerClient(1), requestId: RequestId("blocked-listener") }
          ).pipe(Effect.scoped, Effect.forkScoped)

          yield* Deferred.await(waitingForEvent)
          yield* Fiber.interrupt(listener)
          yield* Deferred.await(released)
        }))

      it.effect("should acknowledge with the exact identifier when it is numeric or string-valued", () =>
        Effect.gen(function*() {
          const fixture = yield* makeSubscriptionHarness(protocol)
          yield* fixture.server.addTool(makeTool("subscription-baseline"))
          yield* fixture.initialize()

          for (const id of [42, "subscription-42"] as const) {
            const notifications = { toolsListChanged: true }
            const request = yield* listen(fixture, id, notifications)
            assertAcknowledged(yield* fixture.takeMessage, id, notifications)
            yield* request.cancel("test complete")
          }
        }))

      it.effect("should deliver a change notification when its kind is requested", () =>
        Effect.gen(function*() {
          const fixture = yield* makeSubscriptionHarness(protocol)
          yield* fixture.server.addTool(makeTool("subscription-tool-baseline"))
          yield* fixture.server.addPrompt(makePrompt("subscription-prompt-baseline"))
          yield* fixture.initialize()
          const id = "filtered-subscription"
          const notifications = {
            toolsListChanged: true,
            resourcesListChanged: true
          }
          const request = yield* listen(fixture, id, notifications)
          assertAcknowledged(yield* fixture.takeMessage, id, notifications)

          yield* fixture.server.addPrompt(makePrompt("must-not-be-delivered"))
          yield* fixture.server.addTool(makeTool("must-be-delivered"))
          yield* fixture.flushListChanged

          const toolsChanged = yield* fixture.takeMessage
          assert.strictEqual(toolsChanged.method, "notifications/tools/list_changed")
          assert.strictEqual(subscriptionIdOf(toolsChanged), id)

          yield* fixture.server.addResource(makeResource("file:///list-change-sentinel"))
          yield* fixture.flushListChanged
          const resourcesChanged = yield* fixture.takeMessage
          assert.strictEqual(resourcesChanged.method, "notifications/resources/list_changed")
          assert.strictEqual(subscriptionIdOf(resourcesChanged), id)

          yield* request.cancel()
        }))

      it.effect("should deliver a resource update when its URI is subscribed", () =>
        Effect.gen(function*() {
          const fixture = yield* makeSubscriptionHarness(protocol)
          yield* fixture.initialize()
          const id = "resource-uri-subscription"
          const notifications = { resourceSubscriptions: ["file:///subscribed"] }
          const request = yield* listen(fixture, id, notifications)
          assertAcknowledged(yield* fixture.takeMessage, id, notifications)

          yield* fixture.server.notifications["notifications/resources/updated"]({ uri: "file:///other" })
          yield* fixture.server.notifications["notifications/resources/updated"]({ uri: "file:///subscribed" })
          const resourceUpdated = yield* fixture.takeMessage
          assert.strictEqual(resourceUpdated.method, "notifications/resources/updated")
          assert.strictEqual(subscriptionIdOf(resourceUpdated), id)
          assert.strictEqual(paramsOf(resourceUpdated).uri, "file:///subscribed")
          yield* request.cancel()
        }))

      it.effect("should acknowledge only the supported subset when requested filters exceed server capabilities", () =>
        Effect.gen(function*() {
          const fixture = yield* makeMcpStdioHarness(protocol, [protocol], toolOnlyRegistration)
          yield* fixture.initialize()
          const request = yield* listen(fixture, "honored-subset", {
            toolsListChanged: true,
            promptsListChanged: true
          })

          assertAcknowledged(yield* fixture.takeMessage, request.id, { toolsListChanged: true })
          yield* request.cancel()

          const unsupported = yield* listen(fixture, "unsupported-filters", {
            toolsListChanged: false,
            promptsListChanged: true
          })
          assertAcknowledged(yield* fixture.takeMessage, unsupported.id, {})
          yield* unsupported.cancel()
        }))

      it.effect("should deliver a matching event to each subscription", () =>
        Effect.gen(function*() {
          const fixture = yield* makeSubscriptionHarness(protocol)
          yield* fixture.initialize()
          const first = yield* listen(fixture, "fanout-first", { toolsListChanged: true })
          const second = yield* listen(fixture, "fanout-second", { toolsListChanged: true })
          assertAcknowledged(yield* fixture.takeMessage, first.id, { toolsListChanged: true })
          assertAcknowledged(yield* fixture.takeMessage, second.id, { toolsListChanged: true })

          yield* fixture.server.addTool(makeTool("fanout-event"))
          yield* fixture.flushListChanged
          const delivered = [yield* fixture.takeMessage, yield* fixture.takeMessage]
          assert.deepStrictEqual(
            delivered.map(subscriptionIdOf).sort(),
            [first.id, second.id].sort()
          )
          yield* first.cancel()
          yield* second.cancel()
        }))

      it.effect("should keep another subscription active when its peer is cancelled", () =>
        Effect.gen(function*() {
          const fixture = yield* makeSubscriptionHarness(protocol)
          yield* fixture.server.addTool(makeTool("concurrent-tool-baseline"))
          yield* fixture.initialize()
          const tools = yield* listen(fixture, "tools-subscription", { toolsListChanged: true })
          const resources = yield* listen(fixture, "resources-subscription", {
            resourceSubscriptions: ["file:///sentinel"]
          })
          assertAcknowledged(yield* fixture.takeMessage, tools.id, { toolsListChanged: true })
          assertAcknowledged(yield* fixture.takeMessage, resources.id, {
            resourceSubscriptions: ["file:///sentinel"]
          })

          yield* fixture.server.addTool(makeTool("concurrent-tool-event"))
          yield* fixture.flushListChanged
          const toolsChanged = yield* fixture.takeMessage
          assert.strictEqual(toolsChanged.method, "notifications/tools/list_changed")
          assert.strictEqual(subscriptionIdOf(toolsChanged), tools.id)

          yield* fixture.server.notifications["notifications/resources/updated"]({ uri: "file:///sentinel" })
          const resourceUpdated = yield* fixture.takeMessage
          assert.strictEqual(resourceUpdated.method, "notifications/resources/updated")
          assert.strictEqual(subscriptionIdOf(resourceUpdated), resources.id)

          yield* tools.cancel("only tools are no longer needed")
          yield* fixture.sendRequest("ping", {})
          yield* fixture.server.addTool(makeTool("cancelled-tools-must-not-receive"))
          yield* fixture.flushListChanged
          yield* fixture.server.notifications["notifications/resources/updated"]({ uri: "file:///sentinel" })

          const surviving = yield* fixture.takeMessage
          assert.strictEqual(surviving.method, "notifications/resources/updated")
          assert.strictEqual(subscriptionIdOf(surviving), resources.id)
          yield* resources.cancel()
        }))

      it.effect("should preserve notification metadata and own the subscription identifier", () =>
        Effect.gen(function*() {
          const fixture = yield* makeSubscriptionHarness(protocol)
          yield* fixture.initialize()
          const request = yield* listen(fixture, "authoritative-subscription", { toolsListChanged: true })
          assertAcknowledged(yield* fixture.takeMessage, request.id, { toolsListChanged: true })

          yield* fixture.server.notifications["notifications/tools/list_changed"]({
            _meta: {
              source: "metadata-sentinel",
              [subscriptionIdKey]: "untrusted-subscription"
            }
          })
          const notification = yield* fixture.takeMessage
          const params = paramsOf(notification)
          const metadata = params._meta
          assert.strictEqual(notification.method, "notifications/tools/list_changed")
          assert(Predicate.isObject(metadata))
          assert.strictEqual(metadata.source, "metadata-sentinel")
          assert.strictEqual(metadata[subscriptionIdKey], request.id)
          yield* request.cancel()
        }))

      it.effect("should deliver modern changes only when an active subscription matches", () =>
        Effect.gen(function*() {
          const fixture = yield* makeSubscriptionHarness(protocol)
          yield* fixture.initialize()
          yield* fixture.server.addTool(makeTool("unsolicited-modern-tool"))
          yield* fixture.flushListChanged

          const request = yield* listen(fixture, "prompt-sentinel", { promptsListChanged: true })
          assertAcknowledged(yield* fixture.takeMessage, request.id, { promptsListChanged: true })
          yield* fixture.server.addPrompt(makePrompt("prompt-sentinel"))
          yield* fixture.flushListChanged
          const notification = yield* fixture.takeMessage
          assert.strictEqual(notification.method, "notifications/prompts/list_changed")
          assert.strictEqual(subscriptionIdOf(notification), request.id)
          yield* request.cancel()
        }))

      it.effect("should preserve legacy notification delivery when modern and legacy adapters are configured", () =>
        Effect.gen(function*() {
          const legacy = McpProtocol.v2025_06_18
          const fixture = yield* makeSubscriptionHarness(legacy, [protocol, legacy])
          yield* fixture.server.addTool(makeTool("mixed-era-baseline"))
          yield* fixture.initialize()
          yield* fixture.sendRequest("tools/list", {})
          yield* fixture.server.addTool(makeTool("mixed-era-legacy-event"))
          yield* fixture.flushListChanged

          const notification = yield* fixture.awaitOutboundMethod("notifications/tools/list_changed")
          assert.notProperty(notification, "id")
          assert.notProperty(paramsOf(notification), "_meta")
        }))

      it.effect("should stream acknowledgment before matching events when using HTTP", () =>
        Effect.gen(function*() {
          const { harness, serverReady } = yield* makeHttpSubscriptionHarness(protocol)
          const id = "reusable-http-subscription"

          const firstResponse = yield* harness.post(httpListenRequest(protocol, id), httpHeaders(protocol))
          const server = yield* Deferred.await(serverReady)
          const first = makeSseReader(firstResponse)
          assertAcknowledged(yield* first.take(), id, { toolsListChanged: true })
          yield* server.addTool(makeTool("http-subscription-event"))
          const notification = yield* first.take()
          assert.strictEqual(notification.method, "notifications/tools/list_changed")
          assert.strictEqual(subscriptionIdOf(notification), id)
          yield* first.cancel
        }))
    })
  })
