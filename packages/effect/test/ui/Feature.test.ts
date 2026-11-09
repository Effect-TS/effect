import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Option, Schema, Scope } from "effect"
import { Feature } from "effect/ui"
import { SaveTodo, Todo, TodoItem, TodoItemEvents, TodoItemMessage } from "./fixtures/components.ts"

class Todos extends Feature.Service<Todos>()("Todos", {
  props: Schema.Struct({ todo: Todo }),
  events: TodoItemEvents
}) {}

describe("Feature", () => {
  it("is a Context.Service carrying the contract's Schemas", () => {
    assert.strictEqual(Todos.key, "feature/Todos")
    assert.strictEqual(Todos[Feature.TypeId].name, "Todos")
    assert.strictEqual(Todos.events, TodoItemEvents)
    assert.isTrue(Feature.isService(Todos))
    assert.isFalse(Feature.isService(TodoItem))
  })

  it("defaults events to Schema.Never", () => {
    class Quiet extends Feature.Service<Quiet>()("Quiet", { props: Schema.Struct({}) }) {}
    assert.strictEqual(Quiet.events, Schema.Never)
  })

  it.effect("layer closes the implementation's requirements with the build site's Context, minus Scope", () =>
    Effect.gen(function*() {
      const fake = Layer.succeed(SaveTodo, () => Effect.succeed(TodoItemMessage.make({ _tag: "Saved" })))
      const layer = Todos.layer(TodoItem).pipe(Layer.provide(fake))
      const context = yield* Layer.build(layer)
      const todos = Context.get(context, Todos)
      assert.strictEqual<unknown>(todos.component, TodoItem)
      assert.isTrue(Option.isSome(Context.getOption(todos.context, SaveTodo)))
      assert.isTrue(Option.isNone(Context.getOption(todos.context, Scope.Scope)))
    }).pipe(Effect.scoped))
})
