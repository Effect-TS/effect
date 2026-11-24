import * as WebhookTransport from "@effect/platform-node/internal/mcpWebhookTransport"
import * as NodeMcpServer from "@effect/platform-node/NodeMcpServer"
import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpServer from "effect/ai/McpServer"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpRouter from "effect/http/HttpRouter"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { createHmac, randomBytes } from "node:crypto"
import * as Http from "node:http"
import type * as Net from "node:net"

// A receiver on loopback that records the paths it is asked for and answers
// `/redirect` with a redirect to `/target`.
const receiver = Effect.acquireRelease(
  Effect.callback<{ readonly port: number; readonly paths: Array<string>; readonly server: Http.Server }>(
    (resume) => {
      const paths: Array<string> = []
      const server = Http.createServer((request, response) => {
        paths.push(request.url ?? "")
        if (request.url === "/redirect") {
          response.writeHead(302, { location: "/target" })
          response.end()
          return
        }
        response.writeHead(200, { "content-type": "text/plain" })
        response.end("ok")
      })
      server.listen(0, "127.0.0.1", () => {
        resume(Effect.succeed({ port: (server.address() as Net.AddressInfo).port, paths, server }))
      })
    }
  ),
  ({ server }) =>
    Effect.callback<void>((resume) => {
      server.closeAllConnections()
      server.close(() => resume(Effect.void))
    })
)

const get = (allowedHosts: ReadonlyArray<string>, url: string) =>
  HttpClient.get(url).pipe(Effect.provide(WebhookTransport.layerHttpClient(allowedHosts)))

const lookup = (
  allowedHosts: ReadonlyArray<string>,
  hostname: string,
  options: { readonly all?: boolean; readonly family?: number }
) =>
  Effect.callback<
    { readonly error: NodeJS.ErrnoException | null; readonly address: unknown; readonly family: unknown }
  >(
    (resume) => {
      WebhookTransport.makeLookup(allowedHosts)(hostname, options, (error, address, family) => {
        resume(Effect.succeed({ error, address, family }))
      })
    }
  )

describe("NodeMcpServer", () => {
  describe("webhook transport", () => {
    it.live("refuses to connect to a host resolving to a loopback address", () =>
      Effect.gen(function*() {
        const { paths, port } = yield* receiver
        const exit = yield* Effect.exit(get([], `http://localhost:${port}/hook`))
        assert.isTrue(Exit.isFailure(exit))
        assert.deepStrictEqual(paths, [])
      }))

    it.live("connects to a host in allowedHosts", () =>
      Effect.gen(function*() {
        const { paths, port } = yield* receiver
        const response = yield* get(["LocalHost"], `http://localhost:${port}/hook`)
        assert.strictEqual(response.status, 200)
        assert.strictEqual(yield* response.text, "ok")
        assert.deepStrictEqual(paths, ["/hook"])
      }))

    it.live("returns redirects without following them", () =>
      Effect.gen(function*() {
        const { paths, port } = yield* receiver
        const response = yield* get(["localhost"], `http://localhost:${port}/redirect`)
        assert.strictEqual(response.status, 302)
        assert.strictEqual(response.headers.location, "/target")
        assert.deepStrictEqual(paths, ["/redirect"])
      }))
  })

  describe("webhook lookup", () => {
    it.live("refuses names resolving to addresses that are not global", () =>
      Effect.gen(function*() {
        const result = yield* lookup([], "localhost", {})
        assert.strictEqual(result.error?.code, "ECONNREFUSED")
        const all = yield* lookup([], "localhost", { all: true })
        assert.strictEqual(all.error?.code, "ECONNREFUSED")
      }))

    it.live("returns the checked addresses in the requested shape", () =>
      Effect.gen(function*() {
        const single = yield* lookup([], "8.8.8.8", {})
        assert.isNull(single.error)
        assert.strictEqual(single.address, "8.8.8.8")
        assert.strictEqual(single.family, 4)
        const all = yield* lookup([], "8.8.8.8", { all: true, family: 4 })
        assert.isNull(all.error)
        assert.deepStrictEqual(all.address, [{ address: "8.8.8.8", family: 4 }])
      }))

    it.live("returns addresses of allowed hosts unchecked", () =>
      Effect.gen(function*() {
        const result = yield* lookup(["localhost"], "localhost", { family: 4 })
        assert.isNull(result.error)
        assert.strictEqual(result.address, "127.0.0.1")
        assert.strictEqual(result.family, 4)
      }))
  })
})

interface Delivery {
  readonly headers: Http.IncomingHttpHeaders
  readonly body: string
}

// A webhook endpoint on loopback: it answers verification challenges and
// queues every other delivery.
const webhookReceiver = Effect.gen(function*() {
  const deliveries = yield* Queue.unbounded<Delivery>()
  const server = yield* Effect.acquireRelease(
    Effect.callback<Http.Server>((resume) => {
      const server = Http.createServer((request, response) => {
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
  return { deliveries, port: (server.address() as Net.AddressInfo).port }
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

  it.live("refuses a callback host outside allowedHosts without contacting it", () =>
    Effect.gen(function*() {
      const { deliveries, port } = yield* webhookReceiver
      const call = yield* makeMcpServer(yield* Queue.unbounded<string>())
      const refused = yield* call("events/subscribe", {
        name: "incident.created",
        delivery: { mode: "webhook", url: `https://127.0.0.1:${port}/hook`, secret }
      })
      assert.strictEqual(refused.error.code, -32602)
      assert.strictEqual(yield* Queue.size(deliveries), 0)
    }))
})
