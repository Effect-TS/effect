import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Schema, SchemaGetter } from "effect"
import {
  ClusterSchema,
  Entity,
  EntityProxy,
  EntityProxyServer,
  MessageStorage,
  TestRunner
} from "effect/unstable/cluster"
import { HttpRouter, HttpServer } from "effect/unstable/http"
import { HttpApi, HttpApiBuilder } from "effect/unstable/httpapi"
import { Rpc } from "effect/unstable/rpc"

class PayloadEncoder extends Context.Service<PayloadEncoder, { readonly record: (value: string) => void }>()(
  "test/EntityProxy/PayloadEncoder"
) {}

const encodedPayload = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.passthrough(),
  encode: SchemaGetter.transformOrFail((value: string) =>
    Effect.map(PayloadEncoder, ({ record }) => {
      record(value)
      return `stored:${value}`
    })
  )
}))

describe("EntityProxy codec runtime controls", () => {
  it.live("raw HTTP discard serializes with the encoder provided to the proxy layer", () =>
    Effect.gen(function*() {
      const encoded: Array<string> = []
      const entity = Entity.make("EncodedProxy", [Rpc.make("Echo", { payload: encodedPayload })])
        .annotateRpcs(ClusterSchema.Persisted, true)
      const api = HttpApi.make("encoded").add(EntityProxy.toHttpApiGroup("entity", entity))
      const cluster = yield* Layer.build(TestRunner.layer)
      const driver = Context.get(cluster, MessageStorage.MemoryDriver)
      const layer = HttpApiBuilder.layer(api).pipe(
        Layer.provide(
          EntityProxyServer.layerHttpApi(api, "entity", entity).pipe(
            Layer.provide(Layer.succeed(PayloadEncoder, { record: (value) => encoded.push(value) }))
          )
        ),
        Layer.provideMerge(
          entity.toLayer({ Echo: () => Effect.void }).pipe(
            Layer.provide(Layer.succeed(PayloadEncoder, { record: () => assert.fail("entity encoder must not run") }))
          )
        ),
        Layer.provide(Layer.succeedContext(cluster)),
        Layer.provide(HttpServer.layerServices)
      )
      const web = yield* Effect.acquireRelease(
        Effect.sync(() => HttpRouter.toWebHandler(layer, { disableLogger: true })),
        ({ dispose }) => Effect.promise(dispose)
      )
      const response = yield* Effect.promise(() =>
        web.handler(
          new Request("http://local/echo/one/discard", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify("hello")
          })
        )
      )
      assert.strictEqual(response.status, 204)
      assert.deepStrictEqual(encoded, ["hello"])
      assert.strictEqual(driver.requests.size, 1)
      const entry = Array.from(driver.requests.values())[0]
      assert.strictEqual(entry.envelope._tag, "Request")
      if (entry.envelope._tag !== "Request") return assert.fail("expected a stored request")
      assert.strictEqual(entry.envelope.payload, "stored:hello")
      assert.strictEqual(entry.envelope.address.entityId, "one")
    }))

  it.live("raw HTTP discard with a plain payload persists without codec services", () =>
    Effect.gen(function*() {
      const entity = Entity.make("PlainProxy", [Rpc.make("Echo", { payload: Schema.String })])
        .annotateRpcs(ClusterSchema.Persisted, true)
      const api = HttpApi.make("plain").add(EntityProxy.toHttpApiGroup("entity", entity))
      const cluster = yield* Layer.build(TestRunner.layer)
      const driver = Context.get(cluster, MessageStorage.MemoryDriver)
      const layer = HttpApiBuilder.layer(api).pipe(
        Layer.provide(EntityProxyServer.layerHttpApi(api, "entity", entity)),
        Layer.provideMerge(entity.toLayer({ Echo: () => Effect.void })),
        Layer.provide(Layer.succeedContext(cluster)),
        Layer.provide(HttpServer.layerServices)
      )
      const web = yield* Effect.acquireRelease(
        Effect.sync(() => HttpRouter.toWebHandler(layer, { disableLogger: true })),
        ({ dispose }) => Effect.promise(dispose)
      )
      const response = yield* Effect.promise(() =>
        web.handler(
          new Request("http://local/echo/plain/discard", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify("hello")
          })
        )
      )
      assert.strictEqual(response.status, 204)
      assert.strictEqual(driver.requests.size, 1)
      const entry = Array.from(driver.requests.values())[0]
      assert.strictEqual(entry.envelope._tag, "Request")
      if (entry.envelope._tag !== "Request") return assert.fail("expected a stored request")
      assert.strictEqual(entry.envelope.payload, "hello")
      assert.strictEqual(entry.envelope.address.entityId, "plain")
    }))
})
