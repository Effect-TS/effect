import { expect, it } from "@effect/vitest"
import { Context, Effect, Layer, Schema, Stream, Struct } from "effect"
import { TestClock } from "effect/testing"
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse
} from "effect/unstable/http"

const Todo = Schema.Struct({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
})
const TodoWithoutId = Schema.Struct({
  ...Struct.omit(Todo.fields, ["id"])
})

const makeJsonPlaceholder = Effect.gen(function*() {
  const client = yield* HttpClient.HttpClient
  const createTodo = (todo: typeof TodoWithoutId.Type) =>
    HttpClientRequest.post("/todos").pipe(
      HttpClientRequest.schemaBodyJson(TodoWithoutId)(todo),
      Effect.flatMap(client.execute),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo))
    )
  return {
    client,
    createTodo
  } as const
})
interface JsonPlaceholder extends Effect.Success<typeof makeJsonPlaceholder> {}
const JsonPlaceholder = Context.Service<JsonPlaceholder>("test/JsonPlaceholder")
const JsonPlaceholderLive = Layer.effect(JsonPlaceholder)(makeJsonPlaceholder)
const JsonPlaceholderRoutes = HttpRouter.serve(HttpRouter.use(Effect.fnUntraced(function*(router) {
  yield* router.addAll([
    HttpRouter.route(
      "GET",
      "/todos/1",
      Effect.succeed(HttpServerResponse.jsonUnsafe({
        userId: 1,
        id: 1,
        title: "test",
        completed: false
      }))
    ),
    HttpRouter.route(
      "POST",
      "/todos",
      Effect.gen(function*() {
        const todo = yield* HttpServerRequest.schemaBodyJson(TodoWithoutId)
        return HttpServerResponse.jsonUnsafe({ ...todo, id: 201 })
      })
    ),
    HttpRouter.route("HEAD", "/todos", Effect.succeed(HttpServerResponse.empty({ status: 200 })))
  ])
})))
const DenoHttpServerUrl = new URL("../../platform-deno/src/DenoHttpServer.ts", import.meta.url).href
const TestServerLive = Layer.unwrap(Effect.promise(() =>
  "Deno" in globalThis
    ? (import(DenoHttpServerUrl) as Promise<{
      readonly layerServer: (options: {
        readonly hostname: string
        readonly port: number
        readonly onListen: () => void
      }) => Layer.Layer<HttpServer.HttpServer>
    }>).then((DenoHttpServer) => DenoHttpServer.layerServer({ hostname: "127.0.0.1", port: 0, onListen: () => {} }))
    : Promise.all([
      import("@effect/platform-node/NodeHttpServer"),
      import("node:http")
    ]).then(([NodeHttpServer, Http]) => NodeHttpServer.layerServer(Http.createServer, { port: 0 }))
))
;[
  {
    name: "FetchHttpClient",
    layer: FetchHttpClient.layer
  }
].forEach(({ layer, name }) => {
  const layerTest = HttpServer.layerTestClient.pipe(
    Layer.provide(layer),
    Layer.provideMerge(TestServerLive)
  )
  const jsonPlaceholderTestLayer = Layer.merge(JsonPlaceholderLive, JsonPlaceholderRoutes).pipe(
    Layer.provideMerge(layerTest)
  )

  it.layer(layer)(name, (it) => {
    it.effect("google", () =>
      flakyTest(Effect.gen(function*() {
        const response = yield* HttpClient.get("https://www.google.com/").pipe(
          Effect.flatMap((_) => _.text)
        )
        expect(response).toContain("Google")
      })))

    it.effect("google followRedirects", () =>
      flakyTest(Effect.gen(function*() {
        const client = (yield* HttpClient.HttpClient).pipe(
          HttpClient.followRedirects()
        )
        const response = yield* client.get("http://google.com/").pipe(
          Effect.flatMap((_) => _.text)
        )
        expect(response).toContain("Google")
      })))

    it.effect("google stream", () =>
      flakyTest(Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.get("https://www.google.com/").pipe(
          Effect.map((_) => _.stream),
          Stream.unwrap,
          Stream.decodeText(),
          Stream.mkString
        )
        expect(response).toContain("Google")
      })))

    it.effect("jsonplaceholder", () =>
      Effect.gen(function*() {
        const jp = yield* JsonPlaceholder
        const response = yield* jp.client.get("/todos/1").pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo))
        )
        expect(response.id).toBe(1)
      }).pipe(Effect.provide(jsonPlaceholderTestLayer)))

    it.effect("jsonplaceholder schemaBodyJson", () =>
      Effect.gen(function*() {
        const jp = yield* JsonPlaceholder
        const response = yield* jp.createTodo({
          userId: 1,
          title: "test",
          completed: false
        })
        expect(response.title).toBe("test")
      }).pipe(Effect.provide(jsonPlaceholderTestLayer)))

    it.effect("head request with schemaJson", () =>
      Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.head("/todos").pipe(
          Effect.flatMap(
            HttpClientResponse.schemaJson(Schema.Struct({ status: Schema.Literal(200) }))
          )
        )
        expect(response).toEqual({ status: 200 })
      }).pipe(Effect.provide(jsonPlaceholderTestLayer)))

    it.effect("interrupt", () =>
      Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.get("https://www.google.com/").pipe(
          Effect.flatMap((_) => _.text),
          Effect.timeout(1),
          Effect.asSome,
          Effect.catchTag("TimeoutError", () => Effect.succeedNone),
          TestClock.withLive
        )
        expect(response._tag).toEqual("None")
      }))

    it.effect("close early", () =>
      flakyTest(Effect.gen(function*() {
        const response = yield* HttpClient.get("https://www.google.com/")
        expect(response.status).toBe(200)
      })))
  })
})

const flakyTest = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.timeoutOrElse({
      duration: "2 seconds",
      orElse: () => Effect.void
    })
  )
