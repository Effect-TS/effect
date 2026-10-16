import { Code, ConnectError, createClient } from "@connectrpc/connect"
import { connectNodeAdapter, createConnectTransport } from "@connectrpc/connect-node"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { ConnectClient, ConnectServer } from "@effect/protobuf"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Layer, Stream } from "effect"
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http"
import type * as NetAddress from "effect/net/NetAddress"
import * as Http from "node:http"
// oxlint-disable-next-line effect/no-js-extension-imports -- generated JS fixture
import { PointService as PointServiceEs } from "./fixtures/gen-es/acme/v1/kitchen_sink_pb.js"
import { PointNotFound, PointService } from "./fixtures/schemas.ts"

const Handlers = PointService.toLayer({
  GetPoint: ({ id }) => id === 404 ? Effect.fail(new PointNotFound({ id })) : Effect.succeed({ x: id, y: id * 2 }),
  ListPoints: ({ limit }) => Stream.range(1, limit).pipe(Stream.map((i) => ({ x: i, y: -i }))),
  Ping: () => Effect.succeed({})
})

const serveEffect = Effect.gen(function*() {
  yield* ConnectServer.layer(PointService).pipe(
    Layer.provide(Handlers),
    (layer) => HttpRouter.serve(layer, { disableListenLog: true }),
    Layer.build
  )
  const server = yield* HttpServer.HttpServer
  return `http://127.0.0.1:${(server.address as NetAddress.InetAddress).port}`
})

describe("Connect", () => {
  for (const format of ["binary", "json"] as const) {
    it.effect(`Effect client -> Effect server (${format})`, () =>
      Effect.gen(function*() {
        const baseUrl = yield* serveEffect
        const client = yield* ConnectClient.make(PointService, { baseUrl, format })
        assert.deepStrictEqual(yield* client.GetPoint({ id: 3 }), { x: 3, y: 6 })
        assert.deepStrictEqual(yield* Stream.runCollect(client.ListPoints({ limit: 3 })), [
          { x: 1, y: -1 },
          { x: 2, y: -2 },
          { x: 3, y: -3 }
        ])
        assert.deepStrictEqual(yield* client.Ping({}), {})
        const exit = yield* Effect.exit(client.GetPoint({ id: 404 }))
        assert.deepStrictEqual(exit, Exit.fail(new PointNotFound({ id: 404 })))
      }).pipe(Effect.provide([NodeHttpServer.layerTest, FetchHttpClient.layer])))
  }

  for (const useBinaryFormat of [true, false]) {
    it.effect(`@connectrpc/connect-node client -> Effect server (binary: ${useBinaryFormat})`, () =>
      Effect.gen(function*() {
        const baseUrl = yield* serveEffect
        const client = createClient(
          PointServiceEs,
          createConnectTransport({ baseUrl, httpVersion: "1.1", useBinaryFormat })
        )
        const point = yield* Effect.promise(() => client.getPoint({ id: 3 }))
        assert.deepStrictEqual({ x: point.x, y: point.y }, { x: 3, y: 6 })

        const streamed = yield* Effect.promise(async () => {
          const out: Array<{ x: number; y: number }> = []
          for await (const p of client.listPoints({ limit: 2 })) out.push({ x: p.x, y: p.y })
          return out
        })
        assert.deepStrictEqual(streamed, [{ x: 1, y: -1 }, { x: 2, y: -2 }])

        const error = yield* Effect.promise(() => client.getPoint({ id: 404 }).then(() => undefined, (e) => e))
        assert.instanceOf(error, ConnectError)
        assert.strictEqual(error.code, Code.NotFound)
        const detail = error.details[0] as { readonly type: string; readonly value: Uint8Array }
        assert.strictEqual(detail.type, "acme.v1.PointNotFound")
        // field 1 (varint) = 404
        assert.deepStrictEqual([...detail.value], [0x08, 0x94, 0x03])
      }).pipe(Effect.provide(NodeHttpServer.layerTest)))
  }

  for (const format of ["binary", "json"] as const) {
    it.effect(`Effect client -> @connectrpc/connect-node server (${format})`, () =>
      Effect.gen(function*() {
        const server = Http.createServer(connectNodeAdapter({
          routes: (router) =>
            router.service(PointServiceEs, {
              getPoint(req) {
                if (req.id === 404) {
                  throw new ConnectError("no such point", Code.NotFound, undefined, [
                    { type: "acme.v1.PointNotFound", value: new Uint8Array([0x08, 0x94, 0x03]) } as any
                  ])
                }
                if (req.id === 500) throw new ConnectError("boom", Code.Internal)
                return { x: req.id, y: req.id * 2 }
              },
              async *listPoints(req) {
                for (let i = 1; i <= req.limit; i++) yield { x: i, y: -i }
              },
              ping() {
                return {}
              }
            })
        }))
        yield* Effect.acquireRelease(
          Effect.callback<void>((resume) => {
            server.listen(0, "127.0.0.1", () => resume(Effect.void))
          }),
          () =>
            Effect.callback<void>((resume) => {
              server.close(() => resume(Effect.void))
            })
        )
        const baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`
        const client = yield* ConnectClient.make(PointService, { baseUrl, format })

        assert.deepStrictEqual(yield* client.GetPoint({ id: 5 }), { x: 5, y: 10 })
        assert.deepStrictEqual(yield* Stream.runCollect(client.ListPoints({ limit: 2 })), [
          { x: 1, y: -1 },
          { x: 2, y: -2 }
        ])
        assert.deepStrictEqual(yield* client.Ping({}), {})
        assert.deepStrictEqual(
          yield* Effect.exit(client.GetPoint({ id: 404 })),
          Exit.fail(new PointNotFound({ id: 404 }))
        )
        const defect = yield* Effect.exit(client.GetPoint({ id: 500 }))
        assert.isTrue(Exit.isFailure(defect) && Cause.hasDies(defect.cause))
      }).pipe(Effect.provide(FetchHttpClient.layer)))
  }
})
