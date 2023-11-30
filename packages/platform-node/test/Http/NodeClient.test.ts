import * as NodeClient from "@effect/platform-node/Http/NodeClient"
import * as Http from "@effect/platform/HttpClient"
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import { describe, expect, it } from "vitest"

const Todo = Schema.struct({
  userId: Schema.number,
  id: Schema.number,
  title: Schema.string,
  completed: Schema.boolean
})

const makeJsonPlaceholder = Effect.gen(function*(_) {
  const defaultClient = yield* _(Http.client.Client)
  const client = defaultClient.pipe(
    Http.client.mapRequest(Http.request.prependUrl("https://jsonplaceholder.typicode.com"))
  )
  const todoClient = client.pipe(
    Http.client.mapEffect(Http.response.schemaBodyJson(Todo))
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
const JsonPlaceholder = Context.Tag<JsonPlaceholder>()
const JsonPlaceholderLive = Layer.provide(
  Layer.effect(JsonPlaceholder, makeJsonPlaceholder),
  NodeClient.layer
)

describe("HttpClient", () => {
  it("google", () =>
    Effect.gen(function*(_) {
      const client = yield* _(Http.client.Client)
      const response = yield* _(
        Http.request.get("https://www.google.com/"),
        client,
        Effect.flatMap((_) => _.text)
      )
      expect(response).toContain("Google")
    }).pipe(Effect.provide(NodeClient.layer), Effect.runPromise))

  it("google stream", () =>
    Effect.gen(function*(_) {
      const client = yield* _(Http.client.Client)
      const response = yield* _(
        Http.request.get("https://www.google.com/"),
        client,
        Effect.map((_) => _.stream),
        Stream.unwrap,
        Stream.runFold("", (a, b) => a + new TextDecoder().decode(b))
      )
      expect(response).toContain("Google")
    }).pipe(Effect.provide(NodeClient.layer), Effect.runPromise))

  it("jsonplaceholder", () =>
    Effect.gen(function*(_) {
      const jp = yield* _(JsonPlaceholder)
      const response = yield* _(Http.request.get("/todos/1"), jp.todoClient)
      expect(response.id).toBe(1)
    }).pipe(Effect.provide(JsonPlaceholderLive), Effect.runPromise))

  it("jsonplaceholder schemaFunction", () =>
    Effect.gen(function*(_) {
      const jp = yield* _(JsonPlaceholder)
      const response = yield* _(jp.createTodo({
        userId: 1,
        title: "test",
        completed: false
      }))
      expect(response.title).toBe("test")
    }).pipe(Effect.provide(JsonPlaceholderLive), Effect.runPromise))

  it("head request with schemaJson", () =>
    Effect.gen(function*(_) {
      const client = yield* _(Http.client.Client)
      const response = yield* _(
        Http.request.head("https://jsonplaceholder.typicode.com/todos"),
        client,
        Effect.flatMap(Http.response.schemaJson(Schema.struct({ status: Schema.literal(200) })))
      )
      expect(response).toEqual({ status: 200 })
    }).pipe(Effect.provide(NodeClient.layer), Effect.runPromise))
})
