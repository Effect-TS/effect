import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema, Stream } from "effect"
import { Ndjson } from "effect/encoding"
import { HttpClient, HttpRouter } from "effect/http"
import { HttpApi, HttpApiBuilder, HttpApiClient, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"

const Progress = Schema.Struct({ status: Schema.String })
const Stats = Schema.Struct({ read: Schema.Date })
class PullError extends Schema.TaggedError<PullError>()("PullError", { reason: Schema.String }) {}

const encoder = new TextEncoder()

// Each body is sent as separate chunks, split inside lines and inside "é"
const rawBodies: Record<string, ReadonlyArray<Uint8Array>> = {
  split: splitAt(encoder.encode("{\"status\":\"héllo\"}\n\n{\"status\":\"done\"}\n"), [13, 21, 26]),
  mismatch: [encoder.encode("{\"status\":\"one\"}\n{\"status\":2}\n")],
  malformed: [encoder.encode("{\"status\":\"one\"}\n{oops\n")]
}

function splitAt(bytes: Uint8Array, offsets: ReadonlyArray<number>): Array<Uint8Array> {
  return [0, ...offsets].map((start, i) => bytes.subarray(start, offsets[i] ?? bytes.length))
}

const Api = HttpApi.make("api").add(
  HttpApiGroup.make("images").add(
    HttpApiEndpoint.get("pull", "/pull", {
      success: HttpApiSchema.StreamNdjson(Progress, { error: PullError })
    }),
    HttpApiEndpoint.get("pullDenied", "/pull-denied", {
      success: HttpApiSchema.StreamNdjson(Progress, { error: PullError })
    }),
    HttpApiEndpoint.get("stats", "/stats", {
      success: HttpApiSchema.WithHeaders(
        HttpApiSchema.StreamNdjson(Stats, { contentType: "application/json" }),
        { "x-container": Schema.String }
      )
    }),
    // Serves fixed byte chunks with a pause between them, so the client receives partial lines
    HttpApiEndpoint.get("raw", "/raw/:name", {
      params: { name: Schema.String },
      success: HttpApiSchema.StreamUint8Array({ contentType: "application/x-ndjson" })
    })
  )
)

// Reads the raw endpoint as NDJSON, like a client for an API served elsewhere
const ClientApi = HttpApi.make("api").add(
  HttpApiGroup.make("raw").add(
    HttpApiEndpoint.get("lines", "/raw/:name", {
      params: { name: Schema.String },
      success: HttpApiSchema.StreamNdjson(Progress)
    })
  )
)

const GroupLayer = HttpApiBuilder.group(Api, "images", (handlers) =>
  handlers
    .handle("pull", () => Effect.succeed(Stream.make({ status: "pulling" }, { status: "done" })))
    .handle("pullDenied", () =>
      Effect.succeed(
        Stream.make({ status: "pulling" }).pipe(Stream.concat(Stream.fail(new PullError({ reason: "denied" }))))
      ))
    .handle("stats", () =>
      Effect.succeed(HttpApiSchema.withHeaders({
        body: Stream.make({ read: new Date(0) }),
        headers: { "x-container": "web" }
      })))
    .handle("raw", ({ params }) =>
      Effect.succeed(
        Stream.fromIterable(rawBodies[params.name]).pipe(
          Stream.tap(() => Effect.sleep("10 millis"))
        )
      )))

const ServerLayer = HttpRouter.serve(
  HttpApiBuilder.layer(Api).pipe(Layer.provide(GroupLayer)),
  { disableListenLog: true, disableLogger: true }
).pipe(Layer.provideMerge(NodeHttpServer.layerTest))

describe("HttpApiSchema.StreamNdjson", () => {
  it.effect("writes one JSON value per line and decodes them on the client", () =>
    Effect.gen(function*() {
      const response = yield* HttpClient.get("/pull")
      assert.strictEqual(response.headers["content-type"], "application/x-ndjson")
      assert.strictEqual(yield* response.text, "{\"status\":\"pulling\"}\n{\"status\":\"done\"}\n")

      const client = yield* HttpApiClient.make(Api)
      const values = yield* client.images.pull().pipe(Effect.flatMap(Stream.runCollect))
      assert.deepStrictEqual(values, [{ status: "pulling" }, { status: "done" }])
    }).pipe(Effect.provide(ServerLayer)))

  it.live("decodes lines split across chunks and skips blank lines", () =>
    Effect.gen(function*() {
      const chunks = yield* Stream.runCollect((yield* HttpClient.get("/raw/split")).stream)
      assert.isAbove(chunks.length, 1)

      const client = yield* HttpApiClient.make(ClientApi)
      const values = yield* client.raw.lines({ params: { name: "split" } }).pipe(Effect.flatMap(Stream.runCollect))
      assert.deepStrictEqual(values, [{ status: "héllo" }, { status: "done" }])
    }).pipe(Effect.provide(ServerLayer)))

  it.live("fails with a SchemaError on a line that does not match the schema", () =>
    Effect.gen(function*() {
      const client = yield* HttpApiClient.make(ClientApi)
      const stream = yield* client.raw.lines({ params: { name: "mismatch" } })
      const error = yield* Effect.flip(Stream.runCollect(stream))
      assert.isTrue(Schema.isSchemaError(error))
    }).pipe(Effect.provide(ServerLayer)))

  it.live("fails with an NdjsonError on a line that is not JSON", () =>
    Effect.gen(function*() {
      const client = yield* HttpApiClient.make(ClientApi)
      const stream = yield* client.raw.lines({ params: { name: "malformed" } })
      const error = yield* Effect.flip(Stream.runCollect(stream))
      assert.isTrue(Ndjson.isNdjsonError(error))
    }).pipe(Effect.provide(ServerLayer)))

  it.effect("ends a failed stream with a reserved failure line that the client fails with", () =>
    Effect.gen(function*() {
      const lines = (yield* (yield* HttpClient.get("/pull-denied")).text).split("\n")
      assert.strictEqual(lines[0], "{\"status\":\"pulling\"}")
      assert.isTrue(lines[1].startsWith("{\"_tag\":\"effect/http-api/stream/failure\",\"cause\":"))

      const client = yield* HttpApiClient.make(Api)
      const values: Array<typeof Progress.Type> = []
      const error = yield* (yield* client.images.pullDenied()).pipe(
        Stream.runForEach((value) => Effect.sync(() => values.push(value))),
        Effect.flip
      )
      assert.deepStrictEqual(values, [{ status: "pulling" }])
      assert.deepStrictEqual(error, new PullError({ reason: "denied" }))
    }).pipe(Effect.provide(ServerLayer)))

  it.effect("encodes values with the JSON codec and supports headers and a custom content type", () =>
    Effect.gen(function*() {
      const response = yield* HttpClient.get("/stats")
      assert.strictEqual(response.headers["content-type"], "application/json")
      assert.strictEqual(yield* response.text, "{\"read\":\"1970-01-01T00:00:00.000Z\"}\n")

      const client = yield* HttpApiClient.make(Api)
      const { body, headers } = yield* client.images.stats()
      assert.deepStrictEqual(headers, { "x-container": "web" })
      assert.deepStrictEqual(yield* Stream.runCollect(body), [{ read: new Date(0) }])
    }).pipe(Effect.provide(ServerLayer)))
})
