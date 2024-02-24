import { runMain } from "@effect/platform-node/NodeRuntime"
import * as Http from "@effect/platform/HttpClient"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

class Todo extends Schema.Class<Todo>()({
  userId: Schema.number,
  id: Schema.number,
  title: Schema.string,
  completed: Schema.boolean
}) {}

const TodoWithoutId = Todo.struct.pipe(Schema.omit("id"))
type TodoWithoutId = Schema.Schema.To<typeof TodoWithoutId>

interface TodoService {
  readonly create: (
    _: TodoWithoutId
  ) => Effect.Effect<Todo, Http.error.HttpClientError | Http.body.BodyError | ParseResult.ParseError>
}
const TodoService = Context.GenericTag<TodoService>("@effect/platform-node/examples/TodoService")

const makeTodoService = Effect.gen(function*(_) {
  const defaultClient = yield* _(Http.client.Client)
  const clientWithBaseUrl = defaultClient.pipe(
    Http.client.filterStatusOk,
    Http.client.mapRequest(Http.request.prependUrl("https://jsonplaceholder.typicode.com"))
  )
  const decodeTodo = Http.response.schemaBodyJsonEffect(Todo)

  const addTodoWithoutIdBody = Http.request.schemaBody(TodoWithoutId)
  const create = (todo: TodoWithoutId) =>
    addTodoWithoutIdBody(
      Http.request.post("/todos"),
      todo
    ).pipe(
      Effect.flatMap(clientWithBaseUrl),
      decodeTodo
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
  runMain
)
