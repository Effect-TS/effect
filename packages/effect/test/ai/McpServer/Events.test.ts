import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpServer from "effect/ai/McpServer"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { makeMcpSseReader, readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"

// https://github.com/modelcontextprotocol/modelcontextprotocol/pull/3415

const modern = McpProtocol.v2026_07_28

const metadata = {
  "io.modelcontextprotocol/protocolVersion": modern.protocolVersion,
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": { name: "EventsClient", version: "1.0.0" }
} as const

const occurrence = {
  eventId: "evt-1",
  timestamp: "2026-11-24T00:00:00.000Z",
  data: { id: "INC-1", severity: 2 }
} as const

const Incident = Schema.Struct({ id: Schema.String, severity: Schema.Number })

const IncidentCreated = McpServer.event({
  name: "incident.created",
  parameters: Schema.Struct({ team: Schema.String }),
  payload: Incident,
  poll: ({ team }, { cursor }) =>
    Effect.succeed({
      events: team === "ops" && cursor === "c0" ? [occurrence] : [],
      cursor: "c1"
    }),
  stream: () =>
    Effect.succeed({
      cursor: "c0",
      items: Stream.concat(Stream.make({ _tag: "Event" as const, cursor: "c1", ...occurrence }), Stream.never)
    })
})

const PollOnly = McpServer.event({
  name: "audit.logged",
  payload: Schema.Struct({}),
  poll: () => Effect.succeed({ events: [], cursor: null })
})

const Hidden = McpServer.visibility(() => Effect.succeed(false))

const SecretPollOnly = McpServer.event({
  name: "secret.logged",
  payload: Schema.Struct({}),
  poll: () => Effect.succeed({ events: [], cursor: null })
}).pipe(Layer.provide(Hidden.layer))

const webhook = {
  mode: "webhook",
  url: "https://hooks.example.com/mcp",
  secret: `whsec_${btoa("0123456789abcdef0123456789abcdef")}`
}

const makeServer = Effect.fnUntraced(function*(
  registrations: Layer.Layer<never, never, McpServer.McpServer> = Layer.mergeAll(
    IncidentCreated,
    PollOnly,
    SecretPollOnly
  )
) {
  const harness = yield* makeHttpHarness(
    registrations.pipe(Layer.provideMerge(makeServerLayer({ name: "EventsServer", protocols: [modern] })))
  )
  const post = (method: string, params: Record<string, unknown> = {}) =>
    harness.post({ jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: metadata } }, {
      "MCP-Protocol-Version": modern.protocolVersion,
      "Mcp-Method": method,
      ...(typeof params.name === "string" ? { "Mcp-Name": params.name } : {})
    })
  const call = Effect.fnUntraced(function*(method: string, params?: Record<string, unknown>) {
    return (yield* readMcpHttpResponse(yield* post(method, params))) as any
  })
  return { post, call }
})

describe("McpServer events", () => {
  it.effect("lists, polls and streams an event type", () =>
    Effect.gen(function*() {
      const { call, post } = yield* makeServer()

      const discovery = yield* call("server/discover")
      assert.isDefined(discovery.result.capabilities.extensions["io.modelcontextprotocol/events"])

      const list = yield* call("events/list")
      assert.deepStrictEqual(
        list.result.events.map((event: any) => [event.name, event.delivery]),
        [["incident.created", ["poll", "push"]], ["audit.logged", ["poll"]]]
      )

      const poll = yield* call("events/poll", { name: "incident.created", arguments: { team: "ops" }, cursor: "c0" })
      assert.deepStrictEqual(poll.result.events, [{ ...occurrence, name: "incident.created" }])
      assert.strictEqual(poll.result.cursor, "c1")

      const reader = makeMcpSseReader(
        yield* post("events/stream", { name: "incident.created", arguments: { team: "ops" } })
      )
      yield* Effect.addFinalizer(() => reader.cancel)
      const active = yield* reader.take()
      assert.strictEqual(active.method, "notifications/events/active")
      assert.deepInclude(active.params, { cursor: "c0", truncated: false })
      const event = yield* reader.take()
      assert.strictEqual(event.method, "notifications/events/event")
      assert.deepInclude(event.params, { ...occurrence, name: "incident.created", cursor: "c1" })
    }))

  it.effect("refuses webhook subscriptions when webhooks are not installed", () =>
    Effect.gen(function*() {
      const { call } = yield* makeServer()
      const params = { name: "incident.created", arguments: { team: "ops" }, delivery: webhook }
      for (const method of ["events/subscribe", "events/unsubscribe"]) {
        const message = yield* call(method, params)
        assert.deepStrictEqual(message.error.code, -32026, method)
        assert.deepStrictEqual(message.error.data, { feature: "deliveryMode", value: "webhook" }, method)
      }
      const missing = yield* call("events/subscribe", { ...params, name: "incident.missing" })
      assert.strictEqual(missing.error.code, -32023)
    }))

  it.effect("answers an unsupported push stream with a plain JSON error", () =>
    Effect.gen(function*() {
      const { post } = yield* makeServer()
      const response = yield* post("events/stream", { name: "audit.logged" })
      assert.match(response.headers.get("content-type") ?? "", /^application\/json/)
      const message = (yield* readMcpHttpResponse(response)) as any
      assert.strictEqual(message.error.code, -32026)
      assert.deepStrictEqual(message.error.data, { feature: "deliveryMode", value: "push" })
    }))

  it.effect("answers NotFound for a hidden event before any delivery check", () =>
    Effect.gen(function*() {
      const { call } = yield* makeServer()
      const list = yield* call("events/list")
      assert.notInclude(list.result.events.map((event: any) => event.name), "secret.logged")
      for (const method of ["events/stream", "events/subscribe", "events/unsubscribe"]) {
        const message = yield* call(method, { name: "secret.logged", delivery: webhook })
        assert.strictEqual(message.error.code, -32023, method)
      }
    }))

  it.effect("reports a gap whose envelope was refused on the next refresh, even after later events", () =>
    Effect.gen(function*() {
      const items = yield* Queue.unbounded<McpServer.EventStreamItem<{ readonly id: string }>>()
      const posted = yield* Queue.unbounded<any>()
      // The endpoint answers the challenge, refuses the gap envelope for good and takes events.
      const endpoint = HttpClient.make((request) => {
        const body = JSON.parse(new TextDecoder().decode((request.body as any).body))
        const answer = body.type === "verification"
          ? new Response(JSON.stringify({ challenge: body.challenge }), { status: 200 })
          : new Response(null, { status: body.type === "gap" ? 410 : 204 })
        return Effect.as(Queue.offer(posted, body), HttpClientResponse.fromWeb(request, answer))
      })
      const Webhooks = McpServer.layerEventWebhooks({ principal: Effect.succeed("alice") }).pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, endpoint)),
        Layer.provide(Layer.succeed(McpServer.CallbackGuard, { check: () => Effect.void }))
      )
      const Feed = McpServer.event({
        name: "feed",
        payload: Schema.Struct({ id: Schema.String }),
        stream: () => Effect.succeed({ cursor: "c0", items: Stream.fromQueue(items) })
      })
      const { call } = yield* makeServer(Layer.mergeAll(Feed, Webhooks))
      const subscribe = (cursor: string) => call("events/subscribe", { name: "feed", delivery: webhook, cursor })

      assert.strictEqual((yield* subscribe("c0")).result.truncated, false)
      assert.strictEqual((yield* Queue.take(posted)).type, "verification")
      yield* Queue.offer(items, { _tag: "Gap", cursor: "c1" })
      assert.strictEqual((yield* Queue.take(posted)).type, "gap")
      yield* Queue.offer(items, { _tag: "Event", cursor: "c2", ...occurrence, data: { id: "2" } })
      assert.strictEqual((yield* Queue.take(posted)).cursor, "c2")

      const refreshed = (yield* subscribe("c2")).result
      assert.strictEqual(refreshed.truncated, true)
      assert.strictEqual(refreshed.cursor, "c2")
      assert.strictEqual((yield* subscribe("c2")).result.truncated, false)
    }))
})
