import { Command, Component, Feature } from "@effect/ui"
import { Context, Effect, Layer, Schema, Scope } from "effect"
import type { KeyValueStore } from "effect/persistence"
import { describe, expect, it } from "tstyche"
import { Counter, SaveTodo, Todo, TodoItem, TodoItemEmits, TodoItemMessage } from "../test/fixtures/components.ts"

const Message = Schema.TaggedUnion({ X: {}, Y: {}, Done: {} })

class A extends Context.Service<A, { readonly a: Effect.Effect<void> }>()("A") {}
class B extends Context.Service<B, { readonly b: Effect.Effect<void> }>()("B") {}

class CA extends Command.Service<CA>()("CA", Effect.succeed(() => Effect.succeed(Message.make({ _tag: "Done" })))) {}
class CB extends Command.Service<CB>()("CB", Effect.succeed(() => Effect.succeed(Message.make({ _tag: "Done" })))) {}

describe("Component", () => {
  describe("Requirements", () => {
    it("names the Command service, not what its implementation uses", () => {
      expect<Component.Requirements<typeof TodoItem>>().type.toBe<SaveTodo>()
      expect(SaveTodo.layer).type.toBe<Layer.Layer<SaveTodo, never, KeyValueStore.KeyValueStore>>()
    })

    it("covers every update branch", () => {
      const C = Component.make({
        name: "C",
        model: Schema.Struct({}),
        message: Message,
        init: () => ({}),
        update: (model, message, $) =>
          Message.match(message, {
            X: () => $.run(CA.make()),
            Y: () => $.run(CB.make()),
            Done: () => model
          }),
        view: (_, h) => h.el("div")
      })
      expect<Component.Requirements<typeof C>>().type.toBe<CA | CB>()
    })

    it("keeps framework services out", () => {
      const UsesScope = Command.make("UsesScope", () => Effect.map(Scope.Scope, () => Message.make({ _tag: "Done" })))
      expect(UsesScope()).type.toBe<Command.Effectful<typeof Message.Type, never>>()
      const C = Component.make({
        name: "C",
        model: Schema.Struct({}),
        message: Message,
        init: ($) => $.set({}).run(UsesScope()),
        update: (model) => model,
        view: (_, h) => h.el("div")
      })
      expect<Component.Requirements<typeof C>>().type.toBe<never>()
    })
  })

  describe("Command.make", () => {
    it("rejects any service that isn't a framework service", () => {
      expect(Command.make).type.not.toBeCallableWith(
        "Save",
        () => Effect.map(A, () => Message.make({ _tag: "Done" }))
      )
      expect(Command.make).type.toBeCallableWith(
        "Roll",
        () => Effect.succeed(Message.make({ _tag: "Done" }))
      )
    })
  })

  describe("Command.Service", () => {
    it("types the implementation by the message it returns", () => {
      expect(SaveTodo.make({ id: "t1", title: "milk", done: false })).type.toBe<
        Command.Effectful<TodoItemMessage, SaveTodo>
      >()
      expect(Layer.succeed(SaveTodo)).type.toBeCallableWith(() =>
        Effect.succeed(TodoItemMessage.make({ _tag: "Saved" }))
      )
      expect(Layer.succeed(SaveTodo)).type.not.toBeCallableWith(() => Effect.succeed(Message.make({ _tag: "Done" })))
    })

    it("rejects a function that reaches for a service instead of capturing it", () => {
      expect(Command.Service<B>()).type.not.toBeCallableWith(
        "Bad",
        Effect.succeed(() => Effect.map(A, () => Message.make({ _tag: "Done" })))
      )
      expect(Command.Service<B>()).type.toBeCallableWith(
        "Good",
        Effect.map(A, () => () => Effect.succeed(Message.make({ _tag: "Done" })))
      )
    })
  })

  describe("$.run", () => {
    it("rejects a Command whose result isn't the component's message", () => {
      const $ = null as unknown as Component.Update<{}, typeof Message.Type, never, {}>
      expect($.run).type.toBeCallableWith(CA.make())
      expect($.run).type.not.toBeCallableWith(SaveTodo.make({ id: "", title: "", done: false }))
      expect($.run).type.toBeCallableWith(Command.interrupt(CA))
    })
  })

  describe("provide", () => {
    it("removes what it provides and adds what the Layer needs", () => {
      const RowLive = Component.provide(TodoItem, [SaveTodo.layer])
      expect<Component.Requirements<typeof RowLive>>().type.toBe<KeyValueStore.KeyValueStore>()
      expect<Component.Message<typeof RowLive>>().type.toBe<TodoItemMessage>()
      const Curried = TodoItem.pipe(Component.provide(SaveTodo.layer))
      expect<Component.Requirements<typeof Curried>>().type.toBe<KeyValueStore.KeyValueStore>()
      const FromProps = Component.provide(TodoItem, (props) => {
        expect(props).type.toBe<{ readonly todo: Todo }>()
        return Layer.succeed(SaveTodo, () => Effect.succeed(TodoItemMessage.make({ _tag: "Saved" })))
      })
      expect<Component.Requirements<typeof FromProps>>().type.toBe<never>()
      expect<Component.Props<typeof FromProps>>().type.toBe<{ readonly todo: Todo }>()
    })

    it("requires onFailure when the Layer can fail", () => {
      const failing = Layer.effect(SaveTodo, Effect.fail("offline" as const))
      expect(Component.provide).type.not.toBeCallableWith(TodoItem, failing)
      expect(Component.provide).type.not.toBeCallableWith(TodoItem, [failing])
      expect(Component.provide).type.toBeCallableWith(TodoItem, failing, {
        onFailure: () => TodoItemMessage.make({ _tag: "SaveFailed", reason: "offline" })
      })
      expect(Component.provide).type.not.toBeCallableWith(failing)
    })
  })

  describe("Feature.Service", () => {
    class Todos extends Feature.Service<Todos>()("Todos", {
      props: Schema.Struct({ todo: Todo }),
      emits: TodoItemEmits
    }) {}

    it("accepts an implementation matching the contract and rejects another", () => {
      expect(Todos.layer(TodoItem)).type.toBe<Layer.Layer<Todos, never, SaveTodo>>()
      expect(Todos.layer).type.not.toBeCallableWith(Counter)
    })

    it("surfaces only the feature service in the parent", () => {
      const Parent = Component.make({
        name: "Parent",
        model: Schema.Struct({}),
        message: Schema.Never,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) =>
          h.el(
            "div",
            h.child(Todos, {
              key: "main",
              props: { todo: { id: "", title: "", done: false } },
              fallback: () => h.el("p", "loading")
            }),
            h.child(Counter, { key: "count", props: { initial: 0 } })
          )
      })
      expect<Component.Requirements<typeof Parent>>().type.toBe<Todos>()
    })
  })
})
