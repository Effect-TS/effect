import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Layer, Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Command, Component, View } from "effect/ui"
import { Story } from "effect/ui/testing"
import {
  Counter,
  SaveTodo,
  Search,
  SearchBox,
  SearchMessage,
  TodoItem,
  TodoItemEmits,
  TodoItemMessage,
  TodoList,
  TodoListMessage,
  Upload
} from "./fixtures/components.ts"

const todo = { id: "t1", title: "buy milk", done: false }
const todos = [todo, { id: "t2", title: "write spec", done: false }]

describe("Story", () => {
  describe("Counter", () => {
    it("counts by clicking", () => {
      Story.make(
        Counter,
        { initial: 1 },
        Story.click("+"),
        Story.click("+"),
        Story.click("-"),
        Story.model((model) => assert.strictEqual(model.count, 2)),
        Story.view((view) => assert.strictEqual(View.textOf(view), "-2+"))
      )
    })

    it("given starts from any Model, and steps groups a setup", () => {
      const twice = Story.steps<{ readonly initial: number }, { readonly count: number }, any, never>(
        Story.click("+"),
        Story.click("+")
      )
      const story = Story.make(Counter, { initial: 1 }, Story.given({ count: 10 }), twice)
      assert.strictEqual(story.model.count, 12)
    })
  })

  describe("TodoItem", () => {
    it("reports a toggle to its parent instead of changing the todo", () => {
      Story.make(
        TodoItem,
        { todo },
        Story.click("[ ]"),
        Story.emitted((emitted) =>
          assert.deepStrictEqual(emitted, [TodoItemEmits.make({ _tag: "Toggled", done: true })])
        )
      )
    })

    it("a props change re-renders without reaching update", () => {
      Story.make(
        TodoItem,
        { todo },
        Story.props({ todo: { ...todo, done: true } }),
        Story.view((view) => assert.include(View.textOf(view), "[x]")),
        Story.model((model) => assert.strictEqual(model.saving, false))
      )
    })

    it("a Command stays pending as data until the test resolves it", () => {
      Story.make(
        TodoItem,
        { todo },
        Story.click("save"),
        Story.model((model) => assert.isTrue(model.saving)),
        Story.expectExact(SaveTodo.make(todo)),
        Story.expectHas(SaveTodo),
        Story.check((story) => {
          assert.deepStrictEqual(story.pending.map((entry) => [entry.command.name, entry.command.args, entry.status]), [
            ["todos/SaveTodo", [todo], "running"]
          ])
        }),
        Story.resolve(SaveTodo, TodoItemMessage.make({ _tag: "SaveFailed", reason: "disk full" })),
        Story.model((model) => assert.isFalse(model.saving)),
        Story.expectNone()
      )
    })

    it("fails when a Command is still pending at the end", () => {
      assert.throws(
        () => Story.make(TodoItem, { todo }, Story.send(TodoItemMessage.make({ _tag: "Save" }))),
        /still pending.*todos\/SaveTodo/
      )
    })

    it("resolving by instance matches the arguments", () => {
      assert.throws(
        () =>
          Story.make(
            TodoItem,
            { todo },
            Story.click("save"),
            Story.resolve(SaveTodo.make({ ...todo, id: "other" }), TodoItemMessage.make({ _tag: "Saved" }))
          ),
        /no running todos\/SaveTodo/
      )
    })
  })

  describe("TodoList", () => {
    it("declares one keyed child per todo", () => {
      const story = Story.start(TodoList, { initial: todos })
      assert.deepStrictEqual(Story.children(story.view(), TodoItem).map((child) => child.key), ["t1", "t2"])
    })

    it("reacts to what a child emits", () => {
      Story.make(
        TodoList,
        { initial: todos },
        Story.childEmit("t2", TodoItemEmits.make({ _tag: "Toggled", done: true })),
        Story.model((model) => {
          assert.isTrue(model.todos[1].done)
          assert.isFalse(model.todos[0].done)
        })
      )
    })

    it("hears about a child's failure and shows the slot's fallback", () => {
      const failure = AsyncResult.failure<never, unknown>(Cause.die(new Error("boom")))
      Story.make(
        TodoList,
        { initial: todos },
        Story.childFailure("t1", failure.cause),
        Story.model((model) => assert.deepStrictEqual(model.failed, ["t1"])),
        Story.view((view) => {
          const fallback = Story.fallback(view, "t1", failure)
          assert.strictEqual(View.textOf(fallback!), "buy milk failed")
        })
      )
      assert.strictEqual(
        Story.layerFailure(TodoList, failure),
        undefined
      )
    })

    it("applies Component.provide's onFailure", () => {
      const Provided = Component.provide(
        TodoList,
        () => Layer.effect(SaveTodo, Effect.fail("offline" as const)),
        { onFailure: () => TodoListMessage.make({ _tag: "RowFailed", id: "layer" }) }
      )
      assert.deepStrictEqual(
        Story.layerFailure(Provided, AsyncResult.failure(Cause.fail("offline"))),
        TodoListMessage.make({ _tag: "RowFailed", id: "layer" })
      )
    })
  })

  describe("Command modes", () => {
    it("switch interrupts the earlier run, and the result arrives once", () => {
      Story.make(
        SearchBox,
        {},
        Story.send(SearchMessage.make({ _tag: "Query", text: "a" })),
        Story.send(SearchMessage.make({ _tag: "Query", text: "ab" })),
        Story.check((story) => {
          assert.deepStrictEqual(story.interrupted.map((command) => command.args), [["a"]])
        }),
        Story.expectExact(Search("ab")),
        Story.resolve(Search, SearchMessage.make({ _tag: "Results", items: ["ab"] })),
        Story.model((model) => assert.deepStrictEqual(model.items, ["ab"]))
      )
    })

    it("a stream Command takes next and end, drop ignores a second start, and an interrupt stops it", () => {
      Story.make(
        SearchBox,
        {},
        Story.send(SearchMessage.make({ _tag: "Start" })),
        Story.send(SearchMessage.make({ _tag: "Start" })),
        Story.check((story) => assert.strictEqual(story.dropped.length, 1)),
        Story.next(Upload, SearchMessage.make({ _tag: "Progress", percent: 50 })),
        Story.model((model) => assert.strictEqual(model.percent, 50)),
        Story.subscriptions((keys) => assert.deepStrictEqual(keys, ["tick", "query:\"\""])),
        Story.expectHas(Upload),
        Story.send(SearchMessage.make({ _tag: "Cancel" })),
        Story.check((story) => assert.deepStrictEqual(story.interrupted.map((command) => command.name), ["Upload"])),
        Story.expectNone(),
        Story.send(SearchMessage.make({ _tag: "Start" })),
        Story.end(Upload),
        Story.expectNone()
      )
    })

    it("next and end reject a Command that isn't a stream", () => {
      assert.throws(
        () =>
          Story.make(
            SearchBox,
            {},
            Story.send(SearchMessage.make({ _tag: "Query", text: "a" })),
            Story.next(Search as any, SearchMessage.make({ _tag: "Tick" }))
          ),
        /not a stream Command/
      )
    })
  })

  describe("Command.map", () => {
    const Message = Schema.TaggedUnion({ Upload: {}, Uploaded: { url: Schema.String } })
    const UploadFile = Command.make("UploadFile", (name: string) => Effect.succeed(`https://cdn/${name}`))
    const Avatar = Component.make({
      name: "Avatar",
      model: Schema.Struct({ url: Schema.String }),
      message: Message,
      init: () => ({ url: "" }),
      update: (_model, message, $) =>
        Message.match(message, {
          Upload: () => $.run(UploadFile("me.png").pipe(Command.map((url) => Message.make({ _tag: "Uploaded", url })))),
          Uploaded: ({ url }) => ({ url })
        }),
      view: (model, h) => h.el("img").attr("src", model.url)
    })

    it("resolves with the Command's own message type and replays the mapping", () => {
      Story.make(
        Avatar,
        {},
        Story.send(Message.make({ _tag: "Upload" })),
        Story.expectExact(UploadFile("me.png")),
        Story.resolve(UploadFile, "https://cdn/me.png"),
        Story.model((model) => assert.strictEqual(model.url, "https://cdn/me.png"))
      )
    })

    it("a mapped Command as the target still takes the definition's own result", () => {
      const mapped = UploadFile("me.png").pipe(Command.map((url) => Message.make({ _tag: "Uploaded", url })))
      Story.make(
        Avatar,
        {},
        Story.send(Message.make({ _tag: "Upload" })),
        Story.resolve(mapped, "https://cdn/me.png"),
        Story.model((model) => assert.strictEqual(model.url, "https://cdn/me.png"))
      )
    })
  })

  describe("view defects", () => {
    const Message = Schema.TaggedUnion({ Bump: {} })
    const Broken = Component.make({
      name: "Broken",
      model: Schema.Struct({ n: Schema.Number }),
      message: Message,
      init: () => ({ n: 0 }),
      update: (model) => ({ n: model.n + 1 }),
      view: (model, h) => {
        if (model.n > 0) throw new Error(`view broke at ${model.n}`)
        return h.el("div")
      }
    })

    it("fail the step that changed the Model, even when no step queries the view", () => {
      Story.make(Broken, {})
      assert.throws(() => Story.make(Broken, {}, Story.send(Message.make({ _tag: "Bump" }))), /view broke at 1/)
    })

    it("fail initialisation when init's Model can't be rendered", () => {
      assert.throws(() => Story.make(Broken, {}, Story.given({ n: 5 })), /view broke at 5/)
      const AlwaysBroken = Component.make({
        name: "AlwaysBroken",
        model: Schema.Struct({}),
        message: Message,
        init: () => ({}),
        update: (model) => model,
        view: () => {
          throw new Error("no view")
        }
      })
      assert.throws(() => Story.make(AlwaysBroken, {}), /no view/)
    })
  })
})
