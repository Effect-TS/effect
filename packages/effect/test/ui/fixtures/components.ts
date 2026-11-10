/**
 * The components the tests drive: a counter, a todo row that saves through a
 * Command service and reports to its parent, and the list that reacts to it.
 */
import { Effect, Schema, Stream } from "effect"
import { KeyValueStore } from "effect/persistence"
import { Loader } from "effect/reactivity"
import { Command, Component, Subscription } from "effect/ui"

// ---------------------------------------------------------------------------
// Counter
// ---------------------------------------------------------------------------

export const CounterMessage = Schema.TaggedUnion({ Increment: {}, Decrement: {} })
export type CounterMessage = typeof CounterMessage.Type

export const Counter = Component.make({
  name: "Counter",
  props: Schema.Struct({ initial: Schema.Number }),
  model: Schema.Struct({ count: Schema.Number }),
  message: CounterMessage,
  init: ($) => ({ count: $.props.initial }),
  update: (model, message) =>
    CounterMessage.match(message, {
      Increment: () => ({ count: model.count + 1 }),
      Decrement: () => ({ count: model.count - 1 })
    }),
  view: (model, h) =>
    h.el(
      "div",
      h.el("button", "-").on("click", CounterMessage.make({ _tag: "Decrement" })),
      h.el("span", String(model.count)),
      h.el("button", "+").on("click", CounterMessage.make({ _tag: "Increment" }))
    )
})

// ---------------------------------------------------------------------------
// TodoItem: saves through a Command service, reports a toggle to its parent
// ---------------------------------------------------------------------------

export const Todo = Schema.Struct({ id: Schema.String, title: Schema.String, done: Schema.Boolean })
export type Todo = typeof Todo.Type

export const TodoItemMessage = Schema.TaggedUnion({
  Toggle: {},
  Save: {},
  Saved: {},
  SaveFailed: { reason: Schema.String }
})
export type TodoItemMessage = typeof TodoItemMessage.Type

export const TodoItemEvents = Schema.TaggedUnion({ Toggled: { done: Schema.Boolean } })
export type TodoItemEvents = typeof TodoItemEvents.Type

const encodeTodo = Schema.encodeSync(Schema.fromJsonString(Todo))

/** The read `SaveTodo` invalidates. Nothing in these fixtures watches it. */
export class GetTodo extends Loader.Service<GetTodo>()(
  "todos/GetTodo",
  { args: Schema.Struct({ id: Schema.String }), success: Todo, error: Schema.Never, staleTime: "1 minute" },
  Effect.succeed(({ id }) => Effect.succeed({ id, title: "", done: false }))
) {}

export class SaveTodo extends Command.Service<SaveTodo>()(
  "todos/SaveTodo",
  Effect.gen(function*() {
    const kv = yield* KeyValueStore.KeyValueStore
    return (todo: Todo) => kv.set(`todo/${todo.id}`, encodeTodo(todo))
  }),
  { invalidates: (todo) => [GetTodo.entry({ id: todo.id })] }
) {}

/** The issue site maps the body's two channels to messages. */
export const saveTodo = (todo: Todo) =>
  SaveTodo.make(todo).pipe(Command.match({
    onSuccess: () => TodoItemMessage.make({ _tag: "Saved" }),
    onFailure: (error) => TodoItemMessage.make({ _tag: "SaveFailed", reason: error.message })
  }))

export const TodoItem = Component.make({
  name: "TodoItem",
  props: Schema.Struct({ todo: Todo }),
  model: Schema.Struct({ saving: Schema.Boolean }),
  message: TodoItemMessage,
  events: TodoItemEvents,
  init: ($) => $.set({ saving: false }),
  update: (_model, message, $) =>
    TodoItemMessage.match(message, {
      Toggle: () => $.emit(TodoItemEvents.make({ _tag: "Toggled", done: !$.props.todo.done })),
      Save: () => $.set({ saving: true }).run(saveTodo($.props.todo)),
      Saved: () => ({ saving: false }),
      SaveFailed: () => ({ saving: false })
    }),
  view: (model, h) =>
    h.el(
      "li",
      h.el("button", h.props.todo.done ? "[x]" : "[ ]").on("click", TodoItemMessage.make({ _tag: "Toggle" })),
      h.el("span", h.props.todo.title),
      h.el("button", model.saving ? "saving" : "save").on("click", TodoItemMessage.make({ _tag: "Save" }))
    )
})

// ---------------------------------------------------------------------------
// TodoList: keyed TodoItem children, reacting to what a row reports
// ---------------------------------------------------------------------------

export const TodoListMessage = Schema.TaggedUnion({
  SetDone: { id: Schema.String, done: Schema.Boolean },
  RowFailed: { id: Schema.String }
})
export type TodoListMessage = typeof TodoListMessage.Type

export const TodoList = Component.make({
  name: "TodoList",
  props: Schema.Struct({ initial: Schema.Array(Todo) }),
  model: Schema.Struct({ todos: Schema.Array(Todo), failed: Schema.Array(Schema.String) }),
  message: TodoListMessage,
  init: ($) => ({ todos: $.props.initial, failed: [] }),
  update: (model, message) =>
    TodoListMessage.match(message, {
      SetDone: ({ done, id }) => ({
        ...model,
        todos: model.todos.map((todo) => todo.id === id ? { ...todo, done } : todo)
      }),
      RowFailed: ({ id }) => ({ ...model, failed: [...model.failed, id] })
    }),
  view: (model, h) =>
    h.el(
      "ul",
      model.todos.map((todo) =>
        h.child(TodoItem, {
          key: todo.id,
          props: { todo },
          onEmit: (events) => TodoListMessage.make({ _tag: "SetDone", id: todo.id, done: events.done }),
          onFailure: () => TodoListMessage.make({ _tag: "RowFailed", id: todo.id }),
          fallback: () => h.el("li", `${todo.title} failed`)
        })
      )
    )
})

// ---------------------------------------------------------------------------
// Search: Command modes, a stream Command, an interrupt, and a Subscription
// ---------------------------------------------------------------------------

export const SearchMessage = Schema.TaggedUnion({
  Query: { text: Schema.String },
  Results: { items: Schema.Array(Schema.String) },
  Start: {},
  Cancel: {},
  Progress: { percent: Schema.Number },
  Tick: {}
})
export type SearchMessage = typeof SearchMessage.Type

export const Search = Command.make(
  "Search",
  (text: string) => Effect.succeed(SearchMessage.make({ _tag: "Results", items: [text] })),
  { mode: "switch" }
)

export const Upload = Command.make(
  "Upload",
  (_name: string) => Stream.make(SearchMessage.make({ _tag: "Progress", percent: 100 })),
  { stream: true, mode: "drop", key: (name) => name }
)

export const SearchBox = Component.make({
  name: "SearchBox",
  model: Schema.Struct({
    text: Schema.String,
    items: Schema.Array(Schema.String),
    percent: Schema.Number,
    ticks: Schema.Number
  }),
  message: SearchMessage,
  init: () => ({ text: "", items: [], percent: 0, ticks: 0 }),
  update: (model, message, $) =>
    SearchMessage.match(message, {
      Query: ({ text }) => $.set({ ...model, text }).run(Search(text)),
      Results: ({ items }) => ({ ...model, items }),
      Start: () => $.run(Upload("photo.png")),
      Cancel: () => $.run(Command.interrupt(Upload, "photo.png")),
      Progress: ({ percent }) => ({ ...model, percent }),
      Tick: () => ({ ...model, ticks: model.ticks + 1 })
    }),
  view: (model, h) => h.el("div", model.text),
  subscriptions: (model) => [
    model.percent > 0 && model.percent < 100 &&
    Subscription.make("tick", Stream.make(SearchMessage.make({ _tag: "Tick" }))),
    Subscription.make("query", model.text, () => Stream.empty)
  ]
})
