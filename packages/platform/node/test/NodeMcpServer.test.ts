import * as NodeMcpServer from "@effect/platform-node/NodeMcpServer"
import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpServer from "effect/ai/McpServer"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/http/HttpRouter"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { createHmac, randomBytes } from "node:crypto"
import * as Http from "node:http"
import type * as Net from "node:net"

interface Delivery {
  readonly headers: Http.IncomingHttpHeaders
  readonly body: string
}

// A webhook endpoint on loopback: records requested paths, answers `/redirect`
// with 302 -> `/target`, answers verification challenges, and queues deliveries.
const webhookReceiver = Effect.gen(function*() {
  const deliveries = yield* Queue.unbounded<Delivery>()
  const paths: Array<string> = []
  const server = yield* Effect.acquireRelease(
    Effect.callback<Http.Server>((resume) => {
      const server = Http.createServer((request, response) => {
        paths.push(request.url ?? "")
        if (request.url === "/redirect") {
          response.writeHead(302, { location: "/target" })
          response.end()
          return
        }
        let body = ""
        request.on("data", (chunk) => body += chunk)
        request.on("end", () => {
          const parsed = JSON.parse(body)
          if (parsed.type === "verification") {
            response.writeHead(200, { "content-type": "application/json" })
            response.end(JSON.stringify({ challenge: parsed.challenge }))
            return
          }
          Queue.offerUnsafe(deliveries, { headers: request.headers, body })
          response.writeHead(204)
          response.end()
        })
      })
      server.listen(0, "127.0.0.1", () => resume(Effect.succeed(server)))
    }),
    (server) =>
      Effect.callback<void>((resume) => {
        server.closeAllConnections()
        server.close(() => resume(Effect.void))
      })
  )
  return { deliveries, paths, port: (server.address() as Net.AddressInfo).port }
})

class CurrentUser extends Context.Service<CurrentUser, string>()("test/CurrentUser") {}

// The principal comes from the event's middleware, as it would after authentication.
const Auth = McpServer.middleware<{ provides: CurrentUser }>()((effect) =>
  Effect.provideService(effect, CurrentUser, "alice")
)

const modern = McpProtocol.v2026_07_28

const makeMcpServer = Effect.fnUntraced(function*(occurrences: Queue.Queue<string>) {
  const IncidentCreated = McpServer.event({
    name: "incident.created",
    payload: Schema.Struct({ id: Schema.String }),
    stream: () =>
      Effect.succeed({
        cursor: "0",
        items: Stream.fromQueue(occurrences).pipe(
          Stream.map((id) => ({
            _tag: "Event" as const,
            cursor: id,
            eventId: `evt-${id}`,
            timestamp: "2026-11-24T00:00:00.000Z",
            data: { id }
          }))
        )
      })
  })
  const Webhooks = NodeMcpServer.layerEventWebhooks({ principal: CurrentUser, allowedHosts: ["localhost"] })
  const app = Layer.mergeAll(IncidentCreated, Webhooks).pipe(
    Layer.provide(Auth.layer),
    Layer.provideMerge(McpServer.layerHttp({ name: "Events", version: "1.0.0", path: "/mcp", protocols: [modern] }))
  )
  const { dispose, handler } = HttpRouter.toWebHandler(app, { disableLogger: true })
  yield* Effect.addFinalizer(() => Effect.promise(() => dispose()))
  return Effect.fnUntraced(function*(method: string, params: Record<string, unknown>) {
    const response = yield* Effect.promise(() =>
      handler(
        new Request("http://localhost/mcp", {
          method: "POST",
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
            "mcp-protocol-version": modern.protocolVersion,
            "mcp-method": method,
            "mcp-name": String(params.name)
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params: {
              ...params,
              _meta: {
                "io.modelcontextprotocol/protocolVersion": modern.protocolVersion,
                "io.modelcontextprotocol/clientCapabilities": {}
              }
            }
          })
        })
      )
    )
    return (yield* Effect.promise(() => response.json())) as any
  })
})

const secretBytes = randomBytes(32)
const secret = `whsec_${secretBytes.toString("base64")}`

// Standard Webhooks: HMAC-SHA256 over "id.timestamp.body", sent as "v1,<base64>".
const expectedSignature = ({ body, headers }: Delivery) =>
  `v1,${
    createHmac("sha256", secretBytes)
      .update(`${headers["webhook-id"]}.${headers["webhook-timestamp"]}.${body}`)
      .digest("base64")
  }`

describe("NodeMcpServer.layerEventWebhooks", () => {
  it.live("delivers signed events to a verified callback until unsubscribed", () =>
    Effect.gen(function*() {
      const { deliveries, port } = yield* webhookReceiver
      const occurrences = yield* Queue.unbounded<string>()
      const call = yield* makeMcpServer(occurrences)
      const delivery = { mode: "webhook", url: `http://localhost:${port}/hook`, secret }

      const list = yield* call("events/list", {})
      assert.deepStrictEqual(list.result.events[0].delivery, ["push", "webhook"])

      const subscribed = yield* call("events/subscribe", { name: "incident.created", delivery })
      assert.isString(subscribed.result.id)
      assert.strictEqual(subscribed.result.cursor, "0")

      yield* Queue.offer(occurrences, "1")
      const first = yield* Queue.take(deliveries)
      assert.strictEqual(first.headers["x-mcp-subscription-id"], subscribed.result.id)
      assert.strictEqual(first.headers["webhook-signature"], expectedSignature(first))
      assert.notStrictEqual(first.headers["webhook-id"], "evt-1")
      assert.deepInclude(JSON.parse(first.body), {
        eventId: "evt-1",
        name: "incident.created",
        data: { id: "1" },
        cursor: "1"
      })

      const unsubscribed = yield* call("events/unsubscribe", { name: "incident.created", delivery })
      assert.isUndefined(unsubscribed.error)
      yield* Queue.offer(occurrences, "2")
      yield* Effect.sleep("100 millis")
      assert.strictEqual(yield* Queue.size(deliveries), 0)
    }))

  it.live("refuses unallowed callback hosts without contacting them and does not follow redirects", () =>
    Effect.gen(function*() {
      const { paths, port } = yield* webhookReceiver
      const call = yield* makeMcpServer(yield* Queue.unbounded<string>())

      const refused = yield* call("events/subscribe", {
        name: "incident.created",
        delivery: { mode: "webhook", url: `https://127.0.0.1:${port}/hook`, secret }
      })
      assert.strictEqual(refused.error.code, -32602)
      assert.deepStrictEqual(paths, [])

      const redirected = yield* call("events/subscribe", {
        name: "incident.created",
        delivery: { mode: "webhook", url: `http://localhost:${port}/redirect`, secret }
      })
      assert.strictEqual(redirected.error.code, -32027)
      assert.deepStrictEqual(paths, ["/redirect"])
    }))
})
