import { BunRuntime } from "@effect/platform-bun"
import * as Http from "@effect/platform/HttpClient"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import { Context, Effect, Layer } from "effect"

class Todo extends Schema.Class<Todo>("Todo")({
  userId: Schema.number,
  id: Schema.number,
  title: Schema.string,
  completed: Schema.boolean
}) {}

const TodoWithoutId = Schema.struct(Todo.fields).pipe(Schema.omit("id"))
type TodoWithoutId = Schema.Schema.Type<typeof TodoWithoutId>

interface TodoService {
  readonly create: (
    _: TodoWithoutId
  ) => Effect.Effect<Todo, Http.error.HttpClientError | Http.body.BodyError | ParseResult.ParseError>
}
const TodoService = Context.GenericTag<TodoService>("@effect/platform-bun/examples/TodoService")

const makeTodoService = Effect.gen(function*(_) {
  const defaultClient = yield* _(Http.client.Client)
  const clientWithBaseUrl = defaultClient.pipe(
    Http.client.filterStatusOk,
    Http.client.mapRequest(Http.request.prependUrl("https://jsonplaceholder.typicode.com"))
  )

  const addTodoWithoutIdBody = Http.request.schemaBody(TodoWithoutId)
  const create = (todo: TodoWithoutId) =>
    addTodoWithoutIdBody(
      Http.request.post("/todos"),
      todo
    ).pipe(
      Effect.flatMap(clientWithBaseUrl),
      Http.response.schemaBodyJsonScoped(Todo)
    )

  return TodoService.of({ create })
})

const TodoServiceLive = Layer.effect(TodoService, makeTodoService).pipe(
  Layer.provide(Http.client.layer)
)

Effect.flatMap(
  TodoService,
  (todos) => todos.create({ userId: 1, title: "test", completed: false })
).pipe(
  Effect.tap(Effect.log),
  Effect.provide(TodoServiceLive),
  BunRuntime.runMain
)
