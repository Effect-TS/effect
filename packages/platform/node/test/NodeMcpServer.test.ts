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
import type * as Dns from "node:dns"
import * as Http from "node:http"
import * as Net from "node:net"
import { vi } from "vitest"

// Override OS DNS only when a test installs a fake resolver for a hostname.
const dnsOverrides = vi.hoisted((): {
  guard?: ((hostname: string) => ReadonlyArray<Dns.LookupAddress> | undefined) | undefined
  connect?: ((hostname: string) => ReadonlyArray<Dns.LookupAddress> | undefined) | undefined
} => ({}))

vi.mock("node:dns", async (importOriginal) => {
  const original = await importOriginal<typeof Dns>()
  return {
    ...original,
    lookup: ((hostname: string, options: any, callback?: any) => {
      const cb = typeof options === "function" ? options : callback
      const opts = typeof options === "function" ? {} : (options ?? {})
      const override = dnsOverrides.connect?.(hostname)
      if (override !== undefined) {
        if (opts.all) return cb(null, [...override])
        return cb(null, override[0].address, override[0].family)
      }
      return (original.lookup as any)(hostname, options, callback)
    }) as typeof original.lookup,
    promises: {
      ...original.promises,
      lookup: (async (hostname: string, options?: any) => {
        const override = dnsOverrides.guard?.(hostname)
        if (override !== undefined) {
          return options?.all ? [...override] : override[0]
        }
        return (original.promises.lookup as any)(hostname, options)
      }) as typeof original.promises.lookup
    }
  }
})

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

// A raw TCP listener on loopback that counts any socket connection attempt,
// independent of TLS or HTTP framing.
const tcpListener = Effect.gen(function*() {
  let connections = 0
  const server = yield* Effect.acquireRelease(
    Effect.callback<Net.Server>((resume) => {
      const server = Net.createServer((socket) => {
        connections++
        socket.destroy()
      })
      server.listen(0, "127.0.0.1", () => resume(Effect.succeed(server)))
    }),
    (server) =>
      Effect.callback<void>((resume) => {
        server.close(() => resume(Effect.void))
      })
  )
  return {
    get connections() {
      return connections
    },
    port: (server.address() as Net.AddressInfo).port
  }
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

  it.live("rejects a host that rebinds to a non-global address at connection time without connecting", () =>
    Effect.gen(function*() {
      const listener = yield* tcpListener
      let connectLookups = 0
      dnsOverrides.guard = (host) => host === "rebind.example" ? [{ address: "93.184.215.14", family: 4 }] : undefined
      dnsOverrides.connect = (host) => {
        if (host !== "rebind.example") return undefined
        connectLookups++
        return [{ address: "127.0.0.1", family: 4 }]
      }
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          dnsOverrides.guard = undefined
          dnsOverrides.connect = undefined
        })
      )

      const call = yield* makeMcpServer(yield* Queue.unbounded<string>())
      const subscribed = yield* call("events/subscribe", {
        name: "incident.created",
        delivery: { mode: "webhook", url: `https://rebind.example:${listener.port}/hook`, secret }
      })
      assert.strictEqual(subscribed.error.code, -32027)
      assert.deepStrictEqual(subscribed.error.data, { reason: "challenge_failed" })
      assert.isAbove(connectLookups, 0)
      assert.strictEqual(listener.connections, 0)
    }))
})
