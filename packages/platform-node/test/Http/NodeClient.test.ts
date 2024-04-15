import * as NodeClient from "@effect/platform-node/NodeHttpClient"
import * as Http from "@effect/platform/HttpClient"
import * as Schema from "@effect/schema/Schema"
import { describe, expect, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"

const Todo = Schema.Struct({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
})

const makeJsonPlaceholder = Effect.gen(function*(_) {
  const defaultClient = yield* _(Http.client.Client)
  const client = defaultClient.pipe(
    Http.client.mapRequest(Http.request.prependUrl("https://jsonplaceholder.typicode.com"))
  )
  const todoClient = client.pipe(
    Http.client.mapEffectScoped(Http.response.schemaBodyJson(Todo))
  )
  const createTodo = Http.client.schemaFunction(
    todoClient,
    Todo.pipe(Schema.omit("id"))
  )(Http.request.post("/todos"))
  return {
    client,
    todoClient,
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
        const client = yield* _(Http.client.Client)
        const response = yield* _(
          Http.request.get("https://www.google.com/"),
          client,
          Effect.flatMap((_) => _.text),
          Effect.scoped
        )
        expect(response).toContain("Google")
      }).pipe(Effect.provide(layer)))

    it.effect("google stream", () =>
      Effect.gen(function*(_) {
        const client = yield* _(Http.client.Client)
        const response = yield* _(
          Http.request.get("https://www.google.com/"),
          client,
          Effect.map((_) => _.stream),
          Stream.unwrapScoped,
          Stream.runFold("", (a, b) => a + new TextDecoder().decode(b))
        )
        expect(response).toContain("Google")
      }).pipe(Effect.provide(layer)))

    it.effect("jsonplaceholder", () =>
      Effect.gen(function*(_) {
        const jp = yield* _(JsonPlaceholder)
        const response = yield* _(Http.request.get("/todos/1"), jp.todoClient)
        expect(response.id).toBe(1)
      }).pipe(Effect.provide(JsonPlaceholderLive.pipe(
        Layer.provide(layer)
      ))))

    it.effect("jsonplaceholder schemaFunction", () =>
      Effect.gen(function*(_) {
        const jp = yield* _(JsonPlaceholder)
        const response = yield* _(jp.createTodo({
          userId: 1,
          title: "test",
          completed: false
        }))
        expect(response.title).toBe("test")
      }).pipe(Effect.provide(JsonPlaceholderLive.pipe(
        Layer.provide(layer)
      ))))

    it.effect("head request with schemaJson", () =>
      Effect.gen(function*(_) {
        const client = yield* _(Http.client.Client)
        const response = yield* _(
          Http.request.head("https://jsonplaceholder.typicode.com/todos"),
          client,
          Http.response.schemaJsonEffect(Schema.Struct({ status: Schema.Literal(200) }))
        )
        expect(response).toEqual({ status: 200 })
      }).pipe(Effect.provide(layer)))

    it.live("interrupt", () =>
      Effect.gen(function*(_) {
        const client = yield* _(Http.client.Client)
        const response = yield* _(
          Http.request.get("https://www.google.com/"),
          client,
          Http.response.text,
          Effect.timeout(1),
          Effect.asSome,
          Effect.catchTag("TimeoutException", () => Effect.succeedNone)
        )
        expect(response._tag).toEqual("None")
      }).pipe(Effect.provide(layer)))

    it.effect("close early", () =>
      Effect.gen(function*(_) {
        const response = yield* _(
          Http.request.get("https://www.google.com/"),
          Effect.scoped
        )
        expect(response.status).toBe(200)
      }).pipe(Effect.provide(layer)))
  })
})
