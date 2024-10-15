import type { HttpBody, HttpClientError } from "@effect/platform"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { NodeHttpClient } from "@effect/platform-node"
import { runMain } from "@effect/platform-node/NodeRuntime"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"

class Todo extends Schema.Class<Todo>("Todo")({
  userId: Schema.Number,
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
}) {
  static decodeResponse = HttpClientResponse.schemaBodyJson(Todo)
}

const TodoWithoutId = Schema.Struct(Todo.fields).pipe(Schema.omit("id"))
type TodoWithoutId = Schema.Schema.Type<typeof TodoWithoutId>

interface TodoService {
  readonly create: (
    _: TodoWithoutId
  ) => Effect.Effect<Todo, HttpClientError.HttpClientError | HttpBody.HttpBodyError | ParseResult.ParseError>
}
const TodoService = Context.GenericTag<TodoService>("@effect/platform-node/examples/TodoService")

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
      Effect.flatMap(Todo.decodeResponse),
      Effect.scoped
    )

  return TodoService.of({ create })
})

const TodoServiceLive = Layer.effect(TodoService, makeTodoService).pipe(
  Layer.provide(NodeHttpClient.layer)
)

Effect.flatMap(
  TodoService,
  (todos) => todos.create({ userId: 1, title: "test", completed: false })
).pipe(
  Effect.tap(Effect.log),
  Effect.provide(TodoServiceLive),
  runMain
)
