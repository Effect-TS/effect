import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import * as NodeClient from "@effect/platform-node/NodeHttpClient"
import { describe, expect, it } from "@effect/vitest"
import { Struct } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

const Todo = Schema.Struct({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
})
const TodoWithoutId = Schema.Struct({
  ...Struct.omit(Todo.fields, "id")
})

const makeJsonPlaceholder = Effect.gen(function*(_) {
  const defaultClient = yield* _(HttpClient.HttpClient)
  const client = defaultClient.pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl("https://jsonplaceholder.typicode.com"))
  )
  const createTodo = (todo: typeof TodoWithoutId.Type) =>
    HttpClientRequest.post("/todos").pipe(
      HttpClientRequest.schemaBodyJson(TodoWithoutId)(todo),
      Effect.flatMap(client.execute),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo)),
      Effect.scoped
    )
  return {
    client,
    createTodo
  } as const
})
interface JsonPlaceholder extends Effect.Effect.Success<typeof makeJsonPlaceholder> {}
const JsonPlaceholder = Context.GenericTag<JsonPlaceholder>("test/JsonPlaceholder")
const JsonPlaceholderLive = Layer.effect(JsonPlaceholder, makeJsonPlaceholder)
;[
  {
    name: "node:http",
    layer: NodeClient.layer
  },
  {
    name: "undici",
    layer: NodeClient.layerUndici
  }
].forEach(({ layer, name }) => {
  describe(`NodeHttpClient - ${name}`, () => {
    it.effect("google", () =>
      Effect.gen(function*(_) {
        const response = yield* _(
          HttpClient.get("https://www.google.com/"),
          Effect.flatMap((_) => _.text),
          Effect.scoped
        )
        expect(response).toContain("Google")
      }).pipe(Effect.provide(layer)))

    it.effect("google followRedirects", () =>
      Effect.gen(function*() {
        const client = (yield* HttpClient.HttpClient).pipe(
          HttpClient.followRedirects()
        )
        const response = yield* client.get("http://google.com/").pipe(
          Effect.flatMap((_) => _.text),
          Effect.scoped
        )
        expect(response).toContain("Google")
      }).pipe(Effect.provide(layer)))

    it.effect("google stream", () =>
      Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.get("https://www.google.com/").pipe(
          Effect.map((_) => _.stream),
          Stream.unwrapScoped,
          Stream.runFold("", (a, b) => a + new TextDecoder().decode(b))
        )
        expect(response).toContain("Google")
      }).pipe(Effect.provide(layer)))

    it.effect("jsonplaceholder", () =>
      Effect.gen(function*() {
        const jp = yield* JsonPlaceholder
        const response = yield* jp.client.get("/todos/1").pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo)),
          Effect.scoped
        )
        expect(response.id).toBe(1)
      }).pipe(Effect.provide(JsonPlaceholderLive.pipe(
        Layer.provide(layer)
      ))))

    it.effect("jsonplaceholder schemaBodyJson", () =>
      Effect.gen(function*() {
        const jp = yield* JsonPlaceholder
        const response = yield* jp.createTodo({
          userId: 1,
          title: "test",
          completed: false
        })
        expect(response.title).toBe("test")
      }).pipe(Effect.provide(JsonPlaceholderLive.pipe(
        Layer.provide(layer)
      ))))

    it.effect("head request with schemaJson", () =>
      Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.head("https://jsonplaceholder.typicode.com/todos").pipe(
          Effect.flatMap(
            HttpClientResponse.schemaJson(Schema.Struct({ status: Schema.Literal(200) }))
          ),
          Effect.scoped
        )
        expect(response).toEqual({ status: 200 })
      }).pipe(Effect.provide(layer)))

    it.live("interrupt", () =>
      Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.get("https://www.google.com/").pipe(
          Effect.flatMap((_) => _.text),
          Effect.scoped,
          Effect.timeout(1),
          Effect.asSome,
          Effect.catchTag("TimeoutException", () => Effect.succeedNone)
        )
        expect(response._tag).toEqual("None")
      }).pipe(Effect.provide(layer)))

    it.effect("close early", () =>
      Effect.gen(function*(_) {
        const response = yield* _(
          HttpClient.get("https://www.google.com/"),
          Effect.scoped
        )
        expect(response.status).toBe(200)
      }).pipe(Effect.provide(layer)))
  })
})
