import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import type { HttpBody, HttpClientError } from "@effect/platform"
import { BunRuntime } from "@effect/platform-bun"
import { Context, Effect, Layer } from "effect"
import type * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"

class Todo extends Schema.Class<Todo>("Todo")({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
}) {}

const TodoWithoutId = Schema.Struct(Todo.fields).pipe(Schema.omit("id"))
type TodoWithoutId = Schema.Schema.Type<typeof TodoWithoutId>

interface TodoService {
  readonly create: (
    _: TodoWithoutId
  ) => Effect.Effect<Todo, HttpClientError.HttpClientError | HttpBody.HttpBodyError | ParseResult.ParseError>
}
const TodoService = Context.GenericTag<TodoService>("@effect/platform-bun/examples/TodoService")

const makeTodoService = Effect.gen(function*() {
  const defaultClient = yield* HttpClient.HttpClient
  const clientWithBaseUrl = defaultClient.pipe(
    HttpClient.filterStatusOk,
    HttpClient.mapRequest(HttpClientRequest.prependUrl("https://jsonplaceholder.typicode.com"))
  )

  const addTodoWithoutIdBody = HttpClientRequest.schemaBodyJson(TodoWithoutId)
  const create = (todo: TodoWithoutId) =>
    addTodoWithoutIdBody(
      HttpClientRequest.post("/todos"),
      todo
    ).pipe(
      Effect.flatMap(clientWithBaseUrl.execute),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo)),
      Effect.scoped
    )

  return TodoService.of({ create })
})

const TodoServiceLive = Layer.effect(TodoService, makeTodoService).pipe(
  Layer.provide(FetchHttpClient.layer)
)

Effect.flatMap(
  TodoService,
  (todos) => todos.create({ userId: 1, title: "test", completed: false })
).pipe(
  Effect.tap(Effect.log),
  Effect.provide(TodoServiceLive),
  BunRuntime.runMain
)
