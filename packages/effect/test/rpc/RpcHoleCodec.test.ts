import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Layer, Schema, Stream } from "effect"
import { HttpRouter } from "effect/unstable/http"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import { Rpc, RpcClient, RpcGroup, RpcSchema, RpcSerialization, RpcServer } from "effect/unstable/rpc"

// A hole codec that is observably different from `Schema.toCodecJson`: every
// hole is JSON-lowered and then written as a JSON string. Anything that still
// hardcodes `Schema.toCodecJson` fails to round-trip against it.
const codecForJsonString =
  (<S extends Schema.Top>(schema: S) =>
    Schema.fromJsonString(Schema.toCodecJson(schema as any))) as RpcSerialization.CodecFor

const serialization: RpcSerialization.RpcSerialization["Service"] = RpcSerialization.RpcSerialization.of({
  ...RpcSerialization.ndjson,
  codecFor: codecForJsonString
})

const layerSerialization = Layer.succeed(RpcSerialization.RpcSerialization)(serialization)

class EchoError extends Schema.Error<EchoError>("EchoError")({
  at: Schema.Date
}) {}

const Rpcs = RpcGroup.make(
  Rpc.make("Echo", { payload: { value: Schema.String }, success: Schema.String }),
  Rpc.make("Counts", { payload: { to: Schema.Number }, success: RpcSchema.Stream(Schema.Number, Schema.Never) }),
  Rpc.make("Fail", { payload: {}, success: Schema.Void, error: EchoError }),
  Rpc.make("Boom", { payload: {}, success: Schema.Void })
)

const failedAt = new Date(0)

const Handlers = Rpcs.toLayer({
  Echo: ({ value }) => Effect.succeed(`${value}!`),
  Counts: ({ to }) => Stream.range(1, to),
  Fail: () => Effect.fail(new EchoError({ at: failedAt })),
  Boom: () => Effect.die("boom")
})

const Server = RpcServer.layerHttp({
  group: Rpcs,
  path: "/rpc",
  protocol: "http"
}).pipe(
  Layer.provide(Handlers),
  Layer.provide(layerSerialization)
)

const makeClient = Effect.fnUntraced(function*() {
  const requests: Array<string> = []
  const { dispose, handler } = HttpRouter.toWebHandler(Server)
  yield* Effect.addFinalizer(() => Effect.promise(dispose))

  const httpClient = HttpClient.make((request) => {
    const raw = (request.body as any).body as Uint8Array | string
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw)
    requests.push(text)
    return Effect.map(
      Effect.promise(() => handler(new Request("http://test/rpc", { method: "POST", body: text }))),
      (response) => HttpClientResponse.fromWeb(request, response)
    )
  })

  const client = yield* RpcClient.make(Rpcs).pipe(
    Effect.provide(
      RpcClient.layerProtocolHttp({ url: "http://test/rpc" }).pipe(
        Layer.provide(layerSerialization),
        Layer.provide(Layer.succeed(HttpClient.HttpClient)(httpClient))
      )
    )
  )

  return { client, requests } as const
})

describe("RpcSerialization.codecFor", () => {
  it("built-in serializations JSON-lower the hole", () => {
    const encode = Schema.encodeSync(RpcSerialization.json.codecFor(Schema.Date))
    assert.strictEqual(encode(new Date(0)), "1970-01-01T00:00:00.000Z")
    assert.strictEqual(RpcSerialization.ndjson.codecFor, RpcSerialization.json.codecFor)
    assert.strictEqual(RpcSerialization.msgPack.codecFor, RpcSerialization.json.codecFor)
    assert.strictEqual(RpcSerialization.jsonRpc().codecFor, RpcSerialization.json.codecFor)
  })

  it.effect("fills the request payload hole with the serialization's codec", () =>
    Effect.gen(function*() {
      const { client, requests } = yield* makeClient()

      assert.strictEqual(yield* client.Echo({ value: "hi" }), "hi!")

      assert.strictEqual(requests.length, 1)
      const frame = JSON.parse(requests[0])
      assert.strictEqual(typeof frame.payload, "string", "the payload hole must carry the codec's output")
      assert.deepStrictEqual(JSON.parse(frame.payload), { value: "hi" })
    }))

  it.effect("fills the stream chunk holes with the serialization's codec", () =>
    Effect.gen(function*() {
      const { client } = yield* makeClient()

      assert.deepStrictEqual(yield* Stream.runCollect(client.Counts({ to: 3 })), [1, 2, 3])
    }))

  it.effect("fills the exit hole with the serialization's codec", () =>
    Effect.gen(function*() {
      const { client } = yield* makeClient()

      const error = yield* Effect.flip(client.Fail({}))
      assert.instanceOf(error, EchoError)
      assert.strictEqual(error.at.getTime(), failedAt.getTime())
    }))

  it.effect("fills the defect hole with the serialization's codec", () =>
    Effect.gen(function*() {
      const { client } = yield* makeClient()

      const exit = yield* Effect.exit(client.Boom({}))
      if (Exit.isSuccess(exit)) {
        return assert.fail("expected the handler defect to reach the client")
      }
      assert.include(String(exit.cause), "boom")
    }))
})
